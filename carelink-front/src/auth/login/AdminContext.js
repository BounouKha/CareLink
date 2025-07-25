import React, { createContext, useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [isSuperUser, setIsSuperUser] = useState(null);
    const { get } = useAuthenticatedApi();

    const fetchAdminStatus = async () => {
        try {
            // Check authentication first
            if (!tokenManager.isAuthenticated()) {
                console.log('[AdminContext] User not authenticated');
                setIsSuperUser(false);
                return;
            }

            console.log('[AdminContext] Fetching admin status...');
            const data = await get('http://localhost:8000/account/check-admin/');
            console.log('[AdminContext] Admin status received:', data.is_superuser);
            setIsSuperUser(data.is_superuser);
        } catch (err) {
            console.error('[AdminContext] Error fetching admin status:', err);
            setIsSuperUser(false);
            
            // If it's an authentication error, handle logout
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                console.log('[AdminContext] Authentication error, handling logout');
                tokenManager.handleLogout();
            }
        }
    };

    useEffect(() => {
        // Initial fetch on mount
        fetchAdminStatus();
    }, []);

    // Listen for login events to refresh admin status
    useEffect(() => {
        const handleTokenChange = () => {
            console.log('[AdminContext] Token change detected, refreshing admin status');
            fetchAdminStatus();
        };

        // Listen for storage changes (when tokens are updated)
        window.addEventListener('storage', handleTokenChange);
        
        // Also listen for custom login events
        window.addEventListener('user-login', handleTokenChange);
        
        return () => {
            window.removeEventListener('storage', handleTokenChange);
            window.removeEventListener('user-login', handleTokenChange);
        };
    }, []);

    // Provide a method to manually refresh admin status
    const refreshAdminStatus = () => {
        fetchAdminStatus();
    };

    return (
        <AdminContext.Provider value={{ isSuperUser, refreshAdminStatus }}>
            {children}
        </AdminContext.Provider>
    );
};
