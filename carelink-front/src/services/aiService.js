// CareLink AI Service - Ollama Integration
class AIService {
  constructor() {
    this.endpoint = 'http://localhost:11434/api/generate';
    this.model = 'gemma3';
    this.isAvailable = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      this.isAvailable = response.ok;
      console.log('🤖 Ollama connection:', this.isAvailable ? 'Connected' : 'Failed');
    } catch (error) {
      this.isAvailable = false;
      console.warn('🤖 Ollama not available:', error.message);
    }
  }

  async query(prompt, context = '') {
    if (!this.isAvailable) {
      throw new Error('AI service is not available. Please ensure Ollama is running on localhost:11434');
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\nAssistant:`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.cleanResponse(data.response);
      
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  buildSystemPrompt(context = '') {
    return `You are CareLink Assistant, an AI helper for healthcare coordinators using the CareLink platform.

Your role:
- Help with patient care coordination
- Assist with scheduling and resource management
- Provide quick medical reference information
- Help with administrative tasks
- Answer questions about CareLink platform features
- Reponse in French when requested
- Provide concise, actionable advice
- Maintain patient confidentiality and privacy
- Verifying if a patient is registered in the system
- Verifiying if a patient has their service demands correctly set up
- Always prioritize patient safety and care quality

Guidelines:
- Keep responses concise and professional
- Use healthcare terminology appropriately
- Always prioritize patient safety and privacy
- If unsure about medical advice, recommend consulting healthcare professionals
- Be helpful but remind users that you're an AI assistant

Current context: ${context || 'General healthcare coordination assistance'}

Respond in a helpful, professional tone suitable for healthcare coordinators.`;
  }

  cleanResponse(response) {
    // Clean up the response
    return response
      .replace(/^(Assistant:|AI:|CareLink Assistant:)/i, '')
      .trim()
      .replace(/\n\s*\n/g, '\n')
      .slice(0, 800); // Limit response length
  }

  // Specific CareLink helper methods
  async getPatientSummary(patientData) {
    const context = 'Patient summary generation';
    const prompt = `Based on this patient information, provide a brief care coordination summary:
    ${JSON.stringify(patientData, null, 2)}
    
    Focus on: current status, care priorities, and coordinator action items.`;
    
    return await this.query(prompt, context);
  }

  async suggestScheduling(scheduleData) {
    const context = 'Scheduling optimization';
    const prompt = `Help optimize this care schedule:
    ${JSON.stringify(scheduleData, null, 2)}
    
    Suggest improvements for efficiency and patient care quality.`;
    
    return await this.query(prompt, context);
  }

  async analyzeAlert(alertData) {
    const context = 'Alert analysis and response';
    const prompt = `Analyze this care alert and suggest coordinator actions:
    ${JSON.stringify(alertData, null, 2)}
    
    Provide priority level and recommended next steps.`;
    
    return await this.query(prompt, context);
  }

  async helpWithPlatform(feature) {
    const context = 'CareLink platform assistance';
    const prompt = `Help me understand how to use this CareLink feature: ${feature}
    
    Provide step-by-step guidance for coordinators.`;
    
    return await this.query(prompt, context);
  }
}

// Export singleton instance
export const aiService = new AIService();
export default AIService;
