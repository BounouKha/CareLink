import React, { createContext, useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [isSuperUser, setIsSuperUser] = useState(null);
    const { get } = useAuthenticatedApi();

    useEffect(() => {
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

        fetchAdminStatus();
    }, [get]);

    useEffect(() => {
        console.log('AdminProvider mounted');
        return () => console.log('AdminProvider unmounted');
    }, []);

    return (
        <AdminContext.Provider value={{ isSuperUser }}>
            {children}
        </AdminContext.Provider>
    );
};
