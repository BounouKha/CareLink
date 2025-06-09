import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import { useNavigate } from 'react-router-dom';

const LeftToolbar = ({ userData }) => {
    const [isVisible, setIsVisible] = useState(() => {
        // Initialize from localStorage, default to true
        const saved = localStorage.getItem('leftToolbarVisible');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const navigate = useNavigate();

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('leftToolbarVisible', JSON.stringify(isVisible));
    }, [isVisible]);

    const toggleToolbar = () => {
        setIsVisible(!isVisible);
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };    const handlePatientsClick = () => {
        navigate('/patients');
    };    const handleServiceDemandsClick = () => {
        navigate('/service-demands');
    };    const handleScheduleClick = () => {
        navigate('/schedule');
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
