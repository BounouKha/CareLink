import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import { useNavigate } from 'react-router-dom';
import { SpinnerOnly } from '../../components/LoadingComponents';

const LeftToolbar = ({ userData }) => {
    const [isVisible, setIsVisible] = useState(() => {
        // Initialize from localStorage, default to true
        const saved = localStorage.getItem('leftToolbarVisible');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isNavigating, setIsNavigating] = useState(false);
    const navigate = useNavigate();

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('leftToolbarVisible', JSON.stringify(isVisible));
    }, [isVisible]);    const toggleToolbar = () => {
        setIsVisible(!isVisible);
    };

    // Navigation helper with loading
    const navigateWithLoading = (path, delay = 200) => {
        setIsNavigating(true);
        setTimeout(() => {
            navigate(path);
            setIsNavigating(false);
        }, delay);
    };

    const handleProfileClick = () => {
        navigateWithLoading('/profile');
    };

    const handlePatientsClick = () => {
        navigateWithLoading('/patients');
    };

    const handleServiceDemandsClick = () => {
        navigateWithLoading('/service-demands');
    };

    const handleScheduleClick = () => {
        navigateWithLoading('/schedule');
    };

    const renderRoleSpecificToolbar = () => {
        if (!userData || !userData.user) {
            console.warn('[DEBUG] userData or user is undefined');
            return null;
        }

        console.log('[DEBUG] user role:', userData.user.role);        return (
            <ul className="toolbar-list">
                <li onClick={handleProfileClick} className="clickable">Profile</li>                {(userData.user.role === 'Patient' || userData.user.role === 'Family Patient') && (
                    <>
                        <li onClick={handleServiceDemandsClick} className="clickable">Service Requests</li>
                        <li onClick={handleScheduleClick} className="clickable">Schedule</li>
                    </>
                )}                {(userData.user.role === 'Coordinator' || userData.user.role === 'Administrative') && (
                    <>
                        <li onClick={handlePatientsClick} className="clickable">Patients</li>
                        <li onClick={handleServiceDemandsClick} className="clickable">Service Demands</li>
                        <li onClick={handleScheduleClick} className="clickable">Schedule Calendar</li>
                    </>
                )}
            </ul>
        );
    };    return (
        <>
            {/* Navigation Loading Overlay */}
            {isNavigating && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <SpinnerOnly size="large" />
                </div>
            )}
            
            <div className={`left-toolbar ${isVisible ? 'visible' : 'hidden'}`}>
                {renderRoleSpecificToolbar()}
            </div>
            <button 
                className="toggle-button" 
                onClick={toggleToolbar}
                title={isVisible ? 'Hide toolbar' : 'Show toolbar'}
                aria-label={isVisible ? 'Hide toolbar' : 'Show toolbar'}
            >
                {isVisible ? '<' : '>'}
            </button>
        </>
    );
};

export default LeftToolbar;
