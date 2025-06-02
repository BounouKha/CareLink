import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setError('No access token found');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserRole(data.role);
                } else {
                    setError('Failed to fetch user profile');
                }
            } catch (err) {
                setError('Network error occurred');
                console.error('Error fetching user role:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRole();
    }, []);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (error || !userRole) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RoleProtectedRoute;