// Medical Notes API Service
import { getValidAccessToken } from '../utils/tokenManager';

// Define the API base URL
const API_BASE_URL = 'http://localhost:8000';
const BASE_URL = 'http://localhost:8000/account';

export const medicalNotesService = {
    // Get medical notes for a patient
    getMedicalNotes: async (patientId) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/medical_folder/${patientId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return []; // No medical notes exist yet
                }
                throw new Error(`Failed to fetch medical notes: ${response.status}`);
            }

            const data = await response.json();
            // Return the medical entries array - the API returns the array directly
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching medical notes:', error);
            throw error;
        }
    },

    // Create a new medical note
    createMedicalNote: async (patientId, noteData) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/medical_folder/${patientId}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },                body: JSON.stringify({
                    note: noteData.note, // Backend expects 'note' field
                    service_id: noteData.service_id || null
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create medical note: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating medical note:', error);
            throw error;
        }
    },

    // Update a medical note (if supported by backend)
    updateMedicalNote: async (patientId, noteId, noteData) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/medical_folder/${patientId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },                body: JSON.stringify({
                    id: noteId, // Backend expects 'id' field for the note to update
                    note: noteData.note // Backend expects 'note' field
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update medical note: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating medical note:', error);
            throw error;
        }
    },

    // Delete a medical note (if supported by backend)
    deleteMedicalNote: async (patientId, noteId) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/medical_folder/${patientId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },                body: JSON.stringify({
                    id: noteId // Backend expects 'id' field
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete medical note: ${response.status} ${errorText}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting medical note:', error);
            throw error;
        }
    },    // Get medical notes count for a patient (for displaying on patient cards)
    // This includes both medical folder entries AND internal notes
    getMedicalNotesCount: async (patientId) => {
        try {
            // Get medical folder entries
            const medicalNotes = await medicalNotesService.getMedicalNotes(patientId);
            let medicalCount = medicalNotes.length;
            
            // Get internal notes count (import internalNotesService at runtime to avoid circular dependency)
            let internalCount = 0;
            try {
                const { internalNotesService } = await import('./internalNotesService');
                const internalNotes = await internalNotesService.getInternalNotes(patientId);
                internalCount = internalNotes.length;
            } catch (internalError) {
                // If internal notes can't be fetched (permission denied, etc.), don't fail completely
                console.warn(`Could not fetch internal notes count for patient ${patientId}:`, internalError.message);
                internalCount = 0;
            }
            
            return medicalCount + internalCount;
        } catch (error) {
            console.error(`Error fetching medical notes count for patient ${patientId}:`, error);
            return 0; // Return 0 if there's an error
        }
    },
};
