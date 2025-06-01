import React, { useState } from 'react';
import './layout/LeftToolbar.css'; // Ensure you have the correct path to your CSS file
import { useNavigate } from 'react-router-dom';

const LeftToolbar = ({ userData }) => {
    const [isVisible, setIsVisible] = useState(true);
    const navigate = useNavigate();

    const toggleToolbar = () => {
        setIsVisible(!isVisible);
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    const handlePatientsClick = () => {
        navigate('/patients');
    };

    const renderRoleSpecificToolbar = () => {
        if (!userData || !userData.user) {
            console.warn('[DEBUG] userData or user is undefined');
            return null;
        }

        console.log('[DEBUG] user role:', userData.user.role);

        return (
            <ul className="toolbar-list">
                <li onClick={handleProfileClick} className="clickable">Profile</li>
                {userData.user.role === 'Coordinator' && (
                    <li onClick={handlePatientsClick} className="clickable">Patients</li>
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
