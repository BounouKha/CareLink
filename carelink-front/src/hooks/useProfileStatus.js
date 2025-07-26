import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing user profile status and activation
 */
export const useProfileStatus = () => {
    const [profileStatus, setProfileStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfileStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('http://localhost:8000/account/profile/status/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile status');
            }

            const data = await response.json();
            setProfileStatus(data);

        } catch (err) {
            console.error('Error fetching profile status:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const requestProfileActivation = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('http://localhost:8000/account/profile/request-activation/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to request profile activation');
            }

            return {
                success: true,
                message: data.message,
                ticketId: data.ticket_id
            };

        } catch (err) {
            console.error('Error requesting profile activation:', err);
            return {
                success: false,
                error: err.message
            };
        }
    }, []);

    // Check if user needs profile activation
    const needsActivation = profileStatus?.profile_status?.waiting_for_activation || false;
    
    // Check if specific sections need activation
    const needsMedicalFolder = profileStatus?.profile_status?.missing_sections?.includes('medical_folder') || false;
    const needsDoctorInfo = profileStatus?.profile_status?.missing_sections?.includes('doctor_information') || false;
    const needsMedicalInfo = profileStatus?.profile_status?.missing_sections?.includes('medical_information') || false;

    // Get waiting message
    const waitingMessage = profileStatus?.profile_status?.waiting_message || 'Waiting for activation';

    // Fetch profile status on hook initialization
    useEffect(() => {
        fetchProfileStatus();
    }, [fetchProfileStatus]);

    return {
        profileStatus,
        loading,
        error,
        needsActivation,
        needsMedicalFolder,
        needsDoctorInfo,
        needsMedicalInfo,
        waitingMessage,
        fetchProfileStatus,
        requestProfileActivation
    };
};
