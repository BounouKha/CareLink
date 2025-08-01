import React, { useEffect } from 'react';
import './CareLinkAIWidget.css';
import tokenManager from '../../utils/tokenManager';

// AI Widget Class (Vanilla JS for cross-page compatibility) - Updated 2025-07-31
class CareLinkAIWidgetCore {
  constructor() {
    this.isOpen = false;
    this.isListening = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.ollama = {
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3.2:3b'
    };
    
    // No logging for EU GDPR compliance
    this.userInfo = null;
    
    // API configuration
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/account';
    this.apiEndpoints = {
      stats: '/ai/stats/',
      pendingTasks: '/ai/pending-tasks/',
      patientSearch: '/ai/patient-search/',
      serviceDemandStatus: '/ai/service-demand/',
      providerSchedule: '/ai/provider-schedule/',
      weeklyReport: '/ai/weekly-report/',
      weeklyAppointments: '/ai/weekly-appointments/'
    };
    
    // Lightweight conversation memory
    this.conversationContext = {
      sessionId: this.generateSessionId(),
      currentPatientSearch: null,
      pendingVerification: null,
      lastQuery: null,
      messageCount: 0,
      lastActivity: Date.now()
    };
    
    this.init();
  }

  // Session ID generation for conversation memory
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Conversation memory management
  updateConversationContext(key, value) {
    this.conversationContext[key] = value;
    this.conversationContext.lastActivity = Date.now();
    this.conversationContext.messageCount++;
    console.log('🧠 Conversation context updated:', key, value);
  }

  getConversationContext() {
    return this.conversationContext;
  }

  clearConversationContext() {
    this.conversationContext = {
      sessionId: this.generateSessionId(),
      currentPatientSearch: null,
      pendingVerification: null,
      lastQuery: null,
      messageCount: 0,
      lastActivity: Date.now()
    };
    console.log('🧹 Conversation context cleared');
  }

  // Check if session is still active (30 minutes timeout)
  isSessionActive() {
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    return (Date.now() - this.conversationContext.lastActivity) < thirtyMinutes;
  }

  captureUserInfo(userData) {
    try {
      // Minimal user info for functionality only (no logging)
      this.userInfo = {
        role: userData.user?.role || 'unknown'
      };
      
      console.log('👤 User role captured for functionality:', this.userInfo.role);
    } catch (error) {
      console.error('❌ Error capturing user info:', error);
      this.userInfo = { role: 'unknown' };
    }
  }

  // All logging methods removed for EU GDPR compliance

  // Export functionality removed - no data to export

  // Debug method removed - no data to debug

  // Consent methods removed - no logging needed

  // API Methods for AI
  async makeAPICall(endpoint, params = {}) {
    try {
      const token = tokenManager.getAccessToken();
      console.log('🔑 Token available:', !!token);
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = new URL(this.apiBaseUrl + endpoint);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      console.log('🌐 Making API call to:', url.toString());
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API call successful, data received:', data);
      return data;
    } catch (error) {
      console.error('❌ API call error:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  async getStats() {
    return await this.makeAPICall(this.apiEndpoints.stats);
  }

  async getPendingTasks() {
    return await this.makeAPICall(this.apiEndpoints.pendingTasks);
  }

  async searchPatients(query, limit = 10) {
    return await this.makeAPICall(this.apiEndpoints.patientSearch, { q: query, limit });
  }

  async verifyPatient(identifier, identifierType) {
    const params = {};
    if (identifierType === 'email') {
      params.email = identifier;
    } else if (identifierType === 'national_number') {
      params.national_number = identifier;
    } else if (identifierType === 'birthdate') {
      params.birthdate = identifier;
    }
    return await this.makeAPICall(this.apiEndpoints.patientSearch, params);
  }

  async handleVerificationFollowUp(prompt) {
    try {
      const lowerPrompt = prompt.toLowerCase();
      const context = this.conversationContext.pendingVerification;
      
      console.log('🔄 Handling verification follow-up for:', context);
      
      // Extract email from prompt
      const emailMatch = prompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch) {
        const email = emailMatch[1];
        console.log('📧 Found email in follow-up:', email);
        
        // Verify patient with email
        const result = await this.verifyPatient(email, 'email');
        console.log('📧 Verification result for email:', result);
        
        // Clear pending verification
        this.updateConversationContext('pendingVerification', null);
        
        return result;
      }
      
      // Extract national number from prompt
      const nationalNumberMatch = prompt.match(/(\d{11})/);
      if (nationalNumberMatch) {
        const nationalNumber = nationalNumberMatch[1];
        console.log('🆔 Found national number in follow-up:', nationalNumber);
        
        // Verify patient with national number
        const result = await this.verifyPatient(nationalNumber, 'national_number');
        
        // Clear pending verification
        this.updateConversationContext('pendingVerification', null);
        
        return result;
      }
      
      // Extract birthdate from prompt
      const birthdateMatch = prompt.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
      if (birthdateMatch) {
        const birthdate = birthdateMatch[1];
        console.log('🎂 Found birthdate in follow-up:', birthdate);
        
        // Verify patient with birthdate
        const result = await this.verifyPatient(birthdate, 'birthdate');
        
        // Clear pending verification
        this.updateConversationContext('pendingVerification', null);
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error handling verification follow-up:', error);
      return null;
    }
  }

  async getServiceDemandStatus(demandId) {
    return await this.makeAPICall(this.apiEndpoints.serviceDemandStatus + demandId + '/status/');
  }

  async getProviderSchedule() {
    return await this.makeAPICall(this.apiEndpoints.providerSchedule);
  }

  async getWeeklyReport() {
    return await this.makeAPICall(this.apiEndpoints.weeklyReport);
  }

  async getWeeklyAppointments() {
    return await this.makeAPICall(this.apiEndpoints.weeklyAppointments);
  }

  // Intelligent AI helper methods
  parseDataRequest(response) {
    const match = response.match(/NEED_DATA:\s*(\w+)\s+(.+)/);
    if (match) {
      return {
        function: match[1],
        parameters: match[2].trim()
      };
    }
    return null;
  }

  async fetchRequestedData(dataRequest) {
    console.log('📡 Fetching requested data:', dataRequest);
    
    switch (dataRequest.function) {
      case 'PATIENT_SEARCH':
        return await this.verifyPatient(dataRequest.parameters, 'email');
      case 'STATS':
        return await this.getStats();
      case 'PENDING_TASKS':
        return await this.getPendingTasks();
      case 'SERVICE_DEMAND':
        return await this.getServiceDemandStatus(dataRequest.parameters);
      case 'PROVIDER_SCHEDULE':
        return await this.getProviderSchedule();
      case 'WEEKLY_REPORT':
        return await this.getWeeklyReport();
      case 'WEEKLY_APPOINTMENTS':
        return await this.getWeeklyAppointments();
      default:
        console.error('❌ Unknown function requested:', dataRequest.function);
        return null;
    }
  }

  async queryOllamaWithData(prompt, apiData, onChunk = null) {
    console.log('🤖 Querying Ollama with data:', apiData);
    
    const systemPrompt = `Tu es l'assistant IA CareLink pour la coordination des soins.

DONNÉES FOURNIES: ${JSON.stringify(apiData, null, 2)}

RÈGLES:
- Utilise les données fournies pour répondre directement
- Si success=true avec données patient, fournis IMMÉDIATEMENT les infos complètes
- Réponds en français, concis et professionnel

Question: ${prompt}`;

    const response = await fetch(this.ollama.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.ollama.model,
        prompt: systemPrompt,
        stream: true,
        options: {
          temperature: 0.1,
          max_tokens: 300,
          top_p: 0.7,
          top_k: 10,
          num_ctx: 1024
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullResponse += json.response;
            
            if (onChunk) {
              onChunk(fullResponse);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return fullResponse;
  }

  init() {
    console.log('🚀 Initializing CareLink AI Widget...');
    
    // Debug mode - temporarily show for all authenticated users
    const DEBUG_MODE = true; // Set to false in production
    
    if (DEBUG_MODE) {
      console.log('🚧 DEBUG MODE: Showing AI widget for all authenticated users');
      if (tokenManager.isAuthenticated()) {
        const userData = tokenManager.getTokenInfo();
        console.log('🔍 DEBUG - Full user data:', JSON.stringify(userData, null, 2));
        
        // Capture user information for conversation logging
        this.captureUserInfo(userData);
        
        this.createWidget();
        this.initSpeechRecognition();
        return;
      } else {
        console.log('❌ User not authenticated at all');
        return;
      }
    }
    
    // Normal authentication check
    if (!this.isCoordinatorAuthenticated()) {
      console.log('🚫 AI Widget: User not authenticated as coordinator - widget will not be created');
      return;
    }
    
    console.log('✅ User is authenticated as coordinator - creating AI widget');
    this.createWidget();
    this.initSpeechRecognition();
  }

  isCoordinatorAuthenticated() {
    try {
      console.log('🔍 Checking authentication for AI Widget...');
      
      if (!tokenManager.isAuthenticated()) {
        console.log('❌ User not authenticated');
        return false;
      }
      
      const userData = tokenManager.getTokenInfo();
      console.log('👤 User data:', userData);
      
      if (!userData || !userData.user) {
        console.log('❌ No user data found');
        return false;
      }
      
      const userRole = userData.user.role;
      console.log('🎭 User role:', userRole);
      console.log('🎭 User role type:', typeof userRole);
      
      // Check for coordinator role (case insensitive)
      const isCoordinator = userRole && 
        (userRole.toLowerCase() === 'coordinator' || 
         userRole.toLowerCase() === 'coordinateur' ||
         userRole === 'coordinator' ||
         userRole === 'Coordinator');
      
      console.log('✅ Is coordinator:', isCoordinator);
      
      return isCoordinator;
    } catch (error) {
      console.error('❌ Auth check error:', error);
      return false;
    }
  }

  createWidget() {
    // Create floating button
    const floatingBtn = document.createElement('div');
    floatingBtn.id = 'carelink-ai-btn';
    floatingBtn.innerHTML = `
      <div class="ai-btn-content">
        <span class="ai-icon">🤖</span>
        <span class="ai-text">CareLink-IA</span>
      </div>
    `;

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'carelink-ai-chat';
    chatWindow.innerHTML = `
      <div class="ai-chat-header">
        <h3>🤖 Assistant CareLink</h3>
        <div class="header-controls">
          <button id="ai-chat-close" class="close-btn">×</button>
        </div>
      </div>
      
      <div class="ai-chat-body">
        <div id="ai-chat-messages" class="chat-messages">
          <div class="ai-message">
            <strong>Assistant CareLink:</strong> Bonjour ! Je suis votre assistant de coordination des soins. 
            <br>📊 Je peux vous aider avec les statistiques, rapports, vérification des demandes de traitement, et suivi des tâches.
            <br>💬 Posez-moi vos questions ou parlez-moi !
          </div>
        </div>
        
        <div class="ai-chat-controls">
          <div class="input-row">
            <input type="text" id="ai-text-input" placeholder="Tapez votre question ou cliquez sur le micro..." />
            <button id="ai-voice-btn" class="voice-btn">🎤</button>
            <button id="ai-send-btn" class="send-btn">Envoyer</button>
          </div>
          
          <div class="voice-controls">
            <button id="ai-stop-voice" class="stop-voice-btn" style="display: none;">🛑 Arrêter</button>
            <div id="ai-status" class="status">Prêt</div>
          </div>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(floatingBtn);
    document.body.appendChild(chatWindow);

    // Add event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    const btn = document.getElementById('carelink-ai-btn');
    const chat = document.getElementById('carelink-ai-chat');
    const closeBtn = document.getElementById('ai-chat-close');
    const voiceBtn = document.getElementById('ai-voice-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const textInput = document.getElementById('ai-text-input');
    const stopVoiceBtn = document.getElementById('ai-stop-voice');

    if (!btn || !chat) {
      console.error('❌ AI Widget elements not found');
      return;
    }

    // Toggle chat window
    btn.addEventListener('click', () => this.toggleChat());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeChat());

    // Send message
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (textInput) {
      textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    // Voice controls
    if (voiceBtn) voiceBtn.addEventListener('click', () => this.toggleVoice());
    if (stopVoiceBtn) stopVoiceBtn.addEventListener('click', () => this.stopAllVoice());

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (chat && btn && !chat.contains(e.target) && !btn.contains(e.target)) {
        if (this.isOpen) this.closeChat();
      }
    });
  }

  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR';

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const textInput = document.getElementById('ai-text-input');
        if (textInput) {
          textInput.value = transcript;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateVoiceButton();
        // Auto-send if we got text
        const textInput = document.getElementById('ai-text-input');
        if (textInput) {
          const text = textInput.value.trim();
          if (text) {
            this.sendMessage();
          }
        }
      };
    }
  }

  toggleChat() {
    try {
      const chat = document.getElementById('carelink-ai-chat');
      if (!chat) {
        console.warn('Chat element not found');
        return;
      }
      
      this.isOpen = !this.isOpen;
      
      if (this.isOpen) {
        chat.style.display = 'block';
        setTimeout(() => {
          if (chat.classList) {
            chat.classList.add('show');
          }
        }, 100);
        const textInput = document.getElementById('ai-text-input');
        if (textInput) textInput.focus();
      } else {
        this.closeChat();
      }
    } catch (error) {
      console.error('Error in toggleChat:', error);
    }
  }

  closeChat() {
    try {
      const chat = document.getElementById('carelink-ai-chat');
      if (chat) {
        // Remove the class safely
        if (chat.classList) {
          chat.classList.remove('show');
        }
        setTimeout(() => {
          if (chat.style) {
            chat.style.display = 'none';
          }
          this.isOpen = false;
        }, 300);
      } else {
        // If chat element doesn't exist, just reset the state
        this.isOpen = false;
      }
    } catch (error) {
      console.error('Error in closeChat:', error);
      this.isOpen = false;
    }
    
    // Always try to stop voice regardless of DOM state
    try {
      this.stopAllVoice();
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
    
    // Clear conversation context when chat is closed
    this.clearConversationContext();
  }

  toggleVoice() {
    if (!this.recognition) {
      this.addMessage('system', 'La reconnaissance vocale n\'est pas supportée dans ce navigateur.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.startListening();
    }
  }

  startListening() {
    this.isListening = true;
    this.updateVoiceButton();
    this.updateStatus('🎧 Écoute en cours...');
    
    document.getElementById('ai-text-input').value = '';
    this.recognition.start();
  }

  stopAllVoice() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.synthesis.cancel();
    this.isListening = false;
    this.updateVoiceButton();
    this.updateStatus('Prêt');
  }

  updateVoiceButton() {
    const voiceBtn = document.getElementById('ai-voice-btn');
    const stopBtn = document.getElementById('ai-stop-voice');
    
    if (!voiceBtn || !stopBtn) return;
    
    if (this.isListening) {
      voiceBtn.textContent = '🔴';
      voiceBtn.classList.add('recording');
      stopBtn.style.display = 'inline-block';
    } else {
      voiceBtn.textContent = '🎤';
      voiceBtn.classList.remove('recording');
      stopBtn.style.display = 'none';
    }
  }

  updateStatus(message) {
    const statusElement = document.getElementById('ai-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  async sendMessage() {
    const input = document.getElementById('ai-text-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;

    // Add user message
    this.addMessage('user', message);
    input.value = '';

    // Show thinking
    this.updateStatus('🤖 L\'IA réfléchit...');
    this.addMessage('system', 'Réflexion en cours...');

    try {
      // Remove thinking message and start streaming
      this.removeLastSystemMessage();
      this.updateStatus('🤖 Réponse en cours...');
      
      // Start streaming AI response
      let streamingStarted = false;
      
      const response = await this.queryOllama(message, (partialResponse) => {
        console.log('📝 Streaming chunk received:', partialResponse);
        
                  // Don't show NEED_DATA responses to the user
          if (partialResponse.includes('NEED_DATA:')) {
            console.log('🔄 Hiding data request from user');
            // Show a brief "thinking" message instead
            if (!streamingStarted) {
              streamingStarted = true;
              this.updateStatus('🤖 🔍 Recherche en cours...');
            }
            return;
          }
        
        if (!streamingStarted) {
          streamingStarted = true;
          this.updateStatus('🤖 📝 Génération...');
        }
        // Update the streaming message in real-time
        this.addMessage('ai', partialResponse, true);
      });
      
      // Finalize the streaming message
      this.finalizeStreamingMessage();
      this.updateStatus('Prêt');
      
    } catch (error) {
      this.removeLastSystemMessage();
      this.finalizeStreamingMessage();
      this.addMessage('ai', 'Désolé, j\'ai rencontré une erreur. Veuillez vous assurer qu\'Ollama fonctionne sur localhost:11434');
      this.updateStatus('Erreur');
      console.error('AI Error:', error);
    }
  }

  async queryOllama(prompt, onChunk = null) {
    // Check if session is still active
    if (!this.isSessionActive()) {
      console.log('⏰ Session expired, clearing context');
      this.clearConversationContext();
    }

    // Update conversation context
    this.updateConversationContext('lastQuery', prompt);
    
    console.log('🤖 AI analyzing prompt:', prompt);
    console.log('🧠 Current conversation context:', this.getConversationContext());
    
    // Check if this is a follow-up to a patient verification
    if (this.conversationContext.pendingVerification) {
      console.log('🔄 Processing follow-up verification...');
      const verificationResult = await this.handleVerificationFollowUp(prompt);
      if (verificationResult) {
        console.log('✅ Verification successful, using result:', verificationResult);
        return await this.queryOllamaWithData(prompt, verificationResult, onChunk);
      }
    }

    // Intelligent AI approach: Let Ollama decide what data it needs
    const systemPrompt = `Tu es l'assistant IA CareLink pour la coordination des soins.

FONCTIONS DISPONIBLES:
- PATIENT_SEARCH: Rechercher un patient par nom, email, numéro national
- STATS: Obtenir des statistiques générales
- PENDING_TASKS: Obtenir les tâches en attente
- SERVICE_DEMAND: Vérifier le statut d'une demande de service
- PROVIDER_SCHEDULE: Obtenir le planning des prestataires
- WEEKLY_REPORT: Obtenir le rapport hebdomadaire
- WEEKLY_APPOINTMENTS: Obtenir les rendez-vous de la semaine prochaine ordonnés par patient

RÈGLES STRICTES:
- Si tu as besoin de données, réponds EXACTEMENT: "NEED_DATA: [FONCTION] [PARAMÈTRES]"
- Exemple: "NEED_DATA: PATIENT_SEARCH bob@sull.be"
- Si tu as toutes les données nécessaires, réponds directement
- Réponds UNIQUEMENT en français
- Sois concis et professionnel

Question: ${prompt}`;
    
    try {
      console.log('🤖 Sending to Ollama/Gemma3:');
      console.log('📝 System prompt length:', systemPrompt.length);
      console.log('🔗 Ollama endpoint:', this.ollama.endpoint);
      
      const response = await fetch(this.ollama.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                body: JSON.stringify({
          model: this.ollama.model,
          prompt: systemPrompt,
          stream: true,
          options: {
            temperature: 0.1,
            max_tokens: 300,
            top_p: 0.7,
            top_k: 10,
            num_ctx: 1024
          }
        })
      });

      console.log('🤖 Ollama response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ollama API error:', errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              console.log('🤖 Ollama chunk received:', json.response);
              fullResponse += json.response;
              
              if (onChunk) {
                onChunk(fullResponse);
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

      // Check if Ollama is asking for data
      if (fullResponse.includes('NEED_DATA:')) {
        console.log('🔄 Ollama requesting data:', fullResponse);
        const dataRequest = this.parseDataRequest(fullResponse);
        if (dataRequest) {
          // Don't show the data request to the user - hide it
          console.log('🔄 Fetching data silently...');
          const apiData = await this.fetchRequestedData(dataRequest);
          return await this.queryOllamaWithData(prompt, apiData, onChunk);
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('❌ Ollama query error:', error);
      throw error;
    }
  }

  addMessage(type, message, isStreaming = false) {
    console.log('💬 Adding message:', type, message.substring(0, 50) + '...', 'streaming:', isStreaming);
    const messagesContainer = document.getElementById('ai-chat-messages');
    const timestamp = new Date().toLocaleTimeString();
    
    if (isStreaming && type === 'ai') {
      // For streaming AI messages, update the existing message
      let existingMessage = messagesContainer.querySelector('.ai-message.streaming');
      
      if (!existingMessage) {
        // Create new streaming message
        existingMessage = document.createElement('div');
        existingMessage.className = 'ai-message streaming';
        existingMessage.innerHTML = `<strong>Assistant CareLink:</strong> <span class="message-content"></span> <span class="timestamp">${timestamp}</span>`;
        messagesContainer.appendChild(existingMessage);
      }
      
      // Update the content
      const contentSpan = existingMessage.querySelector('.message-content');
      contentSpan.textContent = message;
      
      // Add typing indicator
      if (!existingMessage.querySelector('.typing-indicator')) {
        const typingIndicator = document.createElement('span');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.textContent = ' ▋';
        typingIndicator.style.animation = 'blink 1s infinite';
        contentSpan.appendChild(typingIndicator);
      }
      
    } else {
      // Regular message (user or completed AI message)
      const messageDiv = document.createElement('div');
      messageDiv.className = `${type}-message`;
      
      if (type === 'user') {
        messageDiv.innerHTML = `<strong>Vous:</strong> ${message} <span class="timestamp">${timestamp}</span>`;
      } else if (type === 'ai') {
        messageDiv.innerHTML = `<strong>Assistant CareLink:</strong> ${message} <span class="timestamp">${timestamp}</span>`;
      } else {
        messageDiv.innerHTML = `<em>${message}</em>`;
        messageDiv.className = 'system-message';
      }
      
      messagesContainer.appendChild(messageDiv);
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  finalizeStreamingMessage() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const streamingMessage = messagesContainer.querySelector('.ai-message.streaming');
    
    if (streamingMessage) {
      // Remove typing indicator
      const typingIndicator = streamingMessage.querySelector('.typing-indicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
      
      // Remove streaming class
      streamingMessage.classList.remove('streaming');
    }
  }

  removeLastSystemMessage() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const systemMessages = messagesContainer.querySelectorAll('.system-message');
    if (systemMessages.length > 0) {
      systemMessages[systemMessages.length - 1].remove();
    }
  }

  sanitizeTextForSpeech(text) {
    // Remove unnecessary characters
    const sanitizedText = text
        .replace(/[*]/g, '') // Remove asterisks
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim(); // Remove leading/trailing spaces

    return sanitizedText;
}

  speakText(text) {
    // Only cancel if there's already speech happening
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    
    const sanitizedText = this.sanitizeTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(sanitizedText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.lang = 'fr-FR'; // Set French language
    
    // Select a French voice
    const voices = this.synthesis.getVoices();
    const frenchVoice = voices.find(voice => 
      voice.lang.includes('fr-FR') || 
      voice.lang.includes('fr') ||
      voice.name.includes('French') ||
      voice.name.includes('Horten') ||
      voice.name.includes('Julie')
    );
    
    if (frenchVoice) {
      utterance.voice = frenchVoice;
      console.log('🗣️ Using French voice:', frenchVoice.name);
    } else {
      console.log('🗣️ No French voice found, using default');
    }

    utterance.onstart = () => {
      console.log('🗣️ Speech started, length:', sanitizedText.length);
      this.updateStatus('🔊 Lecture en cours...');
    };
    
    utterance.onend = () => {
      console.log('🗣️ Speech completed');
      this.updateStatus('Prêt');
    };
    
    utterance.onerror = (event) => {
      console.error('🗣️ Speech error:', event.error);
      this.updateStatus('Erreur de lecture');
    };
    
    this.synthesis.speak(utterance);
  }

  initProgressiveSpeech() {
    this.speechQueue = [];
    this.isSpeaking = false;
    this.lastSpokenEnd = 0;
  }

  processProgressiveSpeech(fullText, lastSpokenEnd) {
    // Find complete sentences in the new text
    const newText = fullText.slice(lastSpokenEnd);
    const sentences = this.extractCompleteSentences(newText);
    
    if (sentences.length > 0) {
      // Add sentences to speech queue
      this.speechQueue.push(...sentences);
      
      // Start speaking if not already speaking
      if (!this.isSpeaking && this.speechQueue.length > 0) {
        this.speakNextInQueue();
      }
      
      // Update last spoken position
      const lastSentence = sentences[sentences.length - 1];
      const lastSentenceEnd = fullText.indexOf(lastSentence, lastSpokenEnd) + lastSentence.length;
      return lastSentenceEnd;
    }
    
    return lastSpokenEnd;
  }

  extractCompleteSentences(text) {
    // Split text into sentences using common sentence endings
    const sentenceEnders = /[.!?]+/g;
    const sentences = [];
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceEnders.exec(text)) !== null) {
      const sentence = text.slice(lastIndex, match.index + match[0].length).trim();
      if (sentence.length > 10) { // Only include substantial sentences
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }
    
    return sentences;
  }

  speakNextInQueue() {
    if (this.speechQueue.length === 0 || this.isSpeaking) {
      return;
    }
    
    this.isSpeaking = true;
    const sentence = this.speechQueue.shift();
    
    this.speakSentence(sentence, () => {
      this.isSpeaking = false;
      // Continue with next sentence if available
      if (this.speechQueue.length > 0) {
        this.speakNextInQueue();
      }
    });
  }

  speakSentence(sentence, onComplete = null) {
    const sanitizedText = this.sanitizeTextForSpeech(sentence);
    if (sanitizedText.length < 5) {
      if (onComplete) onComplete();
      return;
    }
    
    console.log('🗣️ Speaking sentence:', sanitizedText.substring(0, 50) + '...');
    
    const utterance = new SpeechSynthesisUtterance(sanitizedText);
    utterance.rate = 1.0; // Slightly faster for progressive speech
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.lang = 'fr-FR';
    
    // Select a French voice
    const voices = this.synthesis.getVoices();
    const frenchVoice = voices.find(voice => 
      voice.lang.includes('fr-FR') || 
      voice.lang.includes('fr') ||
      voice.name.includes('French') ||
      voice.name.includes('Horten') ||
      voice.name.includes('Julie')
    );
    
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onstart = () => {
      this.updateStatus('🔊 Lecture progressive...');
    };
    
    utterance.onend = () => {
      console.log('🗣️ Sentence completed');
      // Add a small pause between sentences for natural flow
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 200);
    };
    
    utterance.onerror = (event) => {
      console.error('🗣️ Sentence speech error:', event.error);
      if (onComplete) onComplete();
    };
    
    this.synthesis.speak(utterance);
  }




}

// Auto-initialize when page loads
let careLinkAI = null;

function initCareLinkAI() {
  if (!careLinkAI && document.body) {
    careLinkAI = new CareLinkAIWidgetCore();
  }
}

// React Component Wrapper - Force refresh 2025-07-31
const CareLinkAIWidget = () => {
  useEffect(() => {
    console.log('🔄 CareLinkAIWidget component mounting...');
    
    // Initialize the widget when component mounts
    initCareLinkAI();
    
    // Cleanup function
    return () => {
      console.log('🧹 CareLinkAIWidget component cleanup...');
      if (careLinkAI) {
        try {
          const btn = document.getElementById('carelink-ai-btn');
          const chat = document.getElementById('carelink-ai-chat');
          if (btn) btn.remove();
          if (chat) chat.remove();
          careLinkAI = null;
        } catch (error) {
          console.error('Cleanup error:', error);
          careLinkAI = null;
        }
      }
    };
  }, []);

  // This component doesn't render anything visible itself
  // The widget is created directly in the DOM
  return null;
};

export default CareLinkAIWidget;
