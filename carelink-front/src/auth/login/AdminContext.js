import React, { createContext, useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [isSuperUser, setIsSuperUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const { get } = useAuthenticatedApi();

    const fetchUserData = async () => {
        try {
            // Check authentication first
            if (!tokenManager.isAuthenticated()) {
                console.log('[AdminContext] User not authenticated');
                setIsSuperUser(false);
                setUserData(null);
                return;
            }

            console.log('[AdminContext] Fetching user data...');
            const data = await get('http://localhost:8000/account/profile/');
            console.log('[AdminContext] User data received:', data);
            
            setIsSuperUser(data.is_superuser);
            setUserData(data);
        } catch (err) {
            console.error('[AdminContext] Error fetching user data:', err);
            setIsSuperUser(false);
            setUserData(null);
            
            // If it's an authentication error, handle logout
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                console.log('[AdminContext] Authentication error, handling logout');
                tokenManager.handleLogout();
            }
        }
    };

    useEffect(() => {
        // Initial fetch on mount
        fetchUserData();
    }, []);

    // Listen for login events to refresh user data
    useEffect(() => {
        const handleTokenChange = () => {
            console.log('[AdminContext] Token change detected, refreshing user data');
            fetchUserData();
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

    // Provide a method to manually refresh user data
    const refreshUserData = () => {
        fetchUserData();
    };

    return (
        <AdminContext.Provider value={{ isSuperUser, userData, refreshUserData }}>
            {children}
        </AdminContext.Provider>
    );
};
