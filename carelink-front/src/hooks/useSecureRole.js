// Secure role validation hook
// Validates user roles server-side to prevent client-side manipulation

import { useState, useEffect } from 'react';
import tokenManager from '../utils/tokenManager';

export const useSecureRole = () => {
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserRoleSecurely = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Always fetch from server - never trust localStorage
                if (!tokenManager.isAuthenticated()) {
                    throw new Error('Not authenticated');
                }

                const response = await tokenManager.authenticatedFetch(
                    'http://localhost:8000/account/profile/', 
                    { method: 'GET' }
                );

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const userData = await response.json();
                const role = userData.user?.role;

                // Validate role exists and is valid
                const validRoles = [
                    'Patient', 'Family Patient', 'Coordinator', 
                    'Provider', 'Administrative', 'Social Assistant', 'Administrator'
                ];

                if (validRoles.includes(role)) {
                    setUserRole(role);
                } else {
                    console.warn('Invalid or unknown user role received:', role);
                    setUserRole(null);
                }

            } catch (err) {
                console.error('Error fetching user role securely:', err);
                setError(err.message);
                setUserRole(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRoleSecurely();
    }, []);

    // Secure role checking functions
    const canViewInternalNotes = () => {
        const allowedRoles = ['Coordinator', 'Provider', 'Administrative', 'Social Assistant', 'Administrator'];
        return allowedRoles.includes(userRole);
    };

    const canCreateInternalNotes = () => {
        const allowedRoles = ['Coordinator', 'Provider', 'Administrative', 'Social Assistant', 'Administrator'];
        return allowedRoles.includes(userRole);
    };

    const canEditPatients = () => {
        const allowedRoles = ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator'];
        return allowedRoles.includes(userRole);
    };

    const isStaffMember = () => {
        const staffRoles = ['Coordinator', 'Provider', 'Administrative', 'Social Assistant', 'Administrator'];
        return staffRoles.includes(userRole);
    };

    return {
        userRole,
        isLoading,
        error,
        canViewInternalNotes: canViewInternalNotes(),
        canCreateInternalNotes: canCreateInternalNotes(),
        canEditPatients: canEditPatients(),
        isStaffMember: isStaffMember()
    };
};
