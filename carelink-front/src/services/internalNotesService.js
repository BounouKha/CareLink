// Internal Notes API Service
import { getValidAccessToken } from '../utils/tokenManager';

const BASE_URL = 'http://localhost:8000/account';

export const internalNotesService = {    // Get internal notes for a patient
    getInternalNotes: async (patientId) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/internal_notes/${patientId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return []; // No internal notes exist yet
                }
                throw new Error(`Failed to fetch internal notes: ${response.status}`);
            }

            const data = await response.json();
            // Return the notes array from the response
            return data.notes || [];
        } catch (error) {
            console.error('Error fetching internal notes:', error);
            throw error;
        }
    },// Create a new internal note
    createInternalNote: async (patientId, noteData) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/internal_notes/${patientId}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note: noteData.note,
                    service_id: noteData.service_id || null,
                    is_critical: noteData.is_critical || false
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create internal note: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating internal note:', error);
            throw error;
        }
    },    // Update an internal note
    updateInternalNote: async (patientId, noteId, noteData) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/internal_notes/${patientId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note_id: noteId,
                    note: noteData.note,
                    service_id: noteData.service_id || null,
                    is_critical: noteData.is_critical || false
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update internal note: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating internal note:', error);
            throw error;
        }
    },    // Delete an internal note
    deleteInternalNote: async (patientId, noteId) => {
        try {
            const token = await getValidAccessToken();
            const response = await fetch(`${BASE_URL}/internal_notes/${patientId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note_id: noteId
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete internal note: ${response.status} ${errorText}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting internal note:', error);
            throw error;
        }
    }
};
