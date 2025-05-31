import React, { createContext, useState, useEffect } from 'react';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [isSuperUser, setIsSuperUser] = useState(null);

    useEffect(() => {
        const fetchAdminStatus = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('No access token found. Please log in.');
                }

                const response = await fetch('http://localhost:8000/account/check-admin/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsSuperUser(data.is_superuser);
                } else {
                    throw new Error('Failed to fetch admin status.');
                }
            } catch (err) {
                console.error(err.message);
            }
        };

        fetchAdminStatus();
    }, []);

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
