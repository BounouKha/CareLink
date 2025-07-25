import React, { useEffect, useState } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import ScheduleCalendar from './ScheduleCalendar';
import PatientSchedule from './PatientSchedule';
import { SpinnerOnly } from '../../components/LoadingComponents';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager';

const SchedulePage = () => {
    // Translation hook
    const { schedule, common, errors: errorsT } = useCareTranslation();
    
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Use modern authentication API
    const { get } = useAuthenticatedApi();    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (!tokenManager.isAuthenticated()) {
                    window.location.href = '/login';
                    return;
                }

                const profileData = await get('http://localhost:8000/account/profile/');
                setUserData(profileData);
            } catch (err) {
                console.error('Error fetching user profile:', err);
                if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                    tokenManager.handleLogout();
                    window.location.href = '/login';                } else {
                    setError(errorsT('networkError'));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [get]);    const renderScheduleComponent = () => {
        if (!userData?.user?.role) {
            return <div>{errorsT('unableToDetermineUserRole')}</div>;
        }

        const role = userData.user.role;

        if (role === 'Coordinator' || role === 'Administrative') {
            return <ScheduleCalendar />;
        } else if (role === 'Patient' || role === 'Family Patient') {
            return <PatientSchedule />;
        } else {
            return <div>{errorsT('scheduleNotAvailableForRole', { role })}</div>;
        }
    };if (loading) {
        return (
            <BaseLayout>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '400px',
                    padding: '20px' 
                }}>
                    <SpinnerOnly size="large" />
                </div>
            </BaseLayout>
        );
    }

    if (error) {        return (
            <BaseLayout>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>{errorsT('scheduleAccessError')}</h2>
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
