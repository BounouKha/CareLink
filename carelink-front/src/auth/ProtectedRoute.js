import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const [isSuperUser, setIsSuperUser] = useState(null);

    useEffect(() => {
        const fetchAdminStatus = async () => {
            try {
                const token = localStorage.getItem('accessToken');
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
                    setIsSuperUser(false);
                }
            } catch (error) {
                setIsSuperUser(false);
            }
        };

        fetchAdminStatus();
    }, []);

    if (isSuperUser === null) {
        return <p>Loading...</p>; // Show a loading state while checking admin status
    }

    if (!isSuperUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
