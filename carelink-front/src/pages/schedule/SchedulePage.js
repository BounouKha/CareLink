import React, { useEffect, useState } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import ScheduleCalendar from './ScheduleCalendar';
import PatientSchedule from './PatientSchedule';

const SchedulePage = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const response = await fetch('http://localhost:8000/account/profile/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                if (response.ok) {
                    const profileData = await response.json();
                    setUserData(profileData);
                } else {
                    setError('Failed to load user profile');
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setError('Network error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const renderScheduleComponent = () => {
        if (!userData?.user?.role) {
            return <div>Unable to determine user role</div>;
        }

        const role = userData.user.role;

        if (role === 'Coordinator' || role === 'Administrative') {
            return <ScheduleCalendar />;
        } else if (role === 'Patient' || role === 'Family Patient') {
            return <PatientSchedule />;
        } else {
            return <div>Schedule not available for your role: {role}</div>;
        }
    };

    if (loading) {
        return (
            <BaseLayout>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Loading Schedule...</h2>
                </div>
            </BaseLayout>
        );
    }

    if (error) {
        return (
            <BaseLayout>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Schedule Access Error</h2>
                    <p>{error}</p>
                </div>
            </BaseLayout>
        );
    }

    return (
        <BaseLayout>
            {renderScheduleComponent()}
        </BaseLayout>
    );
};

export default SchedulePage;
