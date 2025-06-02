import React, { useState } from 'react';
import './LeftToolbar.css'; // Ensure you have the correct path to your CSS file
import { useNavigate } from 'react-router-dom';

const LeftToolbar = ({ userData }) => {
    const [isVisible, setIsVisible] = useState(true);
    const navigate = useNavigate();

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
        // Get user role to determine which schedule view to show
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                if (userData && userData.user && userData.user.role) {
                    const userRole = userData.user.role;
                    if (userRole === 'Coordinator' || userRole === 'Administrative') {
                        navigate('/schedule/coordinator');
                        return;
                    } else if (userRole === 'Patient' || userRole === 'Family Patient') {
                        navigate('/schedule/patient');
                        return;
                    }
                }
            } catch (err) {
                console.error('Error parsing user data', err);
            }
        }
        // Default fallback
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
    };

    return (
        <div>
            <button className="toggle-button" onClick={toggleToolbar}>
                {isVisible ? '<' : '>'}
            </button>
            <div className={`left-toolbar ${isVisible ? 'visible' : 'hidden'}`}>
                {renderRoleSpecificToolbar()}
            </div>
        </div>
    );
};

export default LeftToolbar;
