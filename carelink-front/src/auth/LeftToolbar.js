import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
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

    const handleCoordinatorTicketsClick = () => {
        navigate('/coordinator/tickets');
    };

    const handleCoordinatorHelpdeskClick = () => {
        navigate('/coordinator/helpdesk');
    };

    const handleTicketsClick = () => {
        navigate('/tickets');
    };

    const handleSubmitTicketClick = () => {
        navigate('/submit-ticket');
    };

    const handleManageTicketsClick = () => {
        navigate('/manage-tickets');
    };

    const renderRoleSpecificToolbar = () => {
        if (!userData || !userData.user) {
            console.warn('[LeftToolbar] userData or user is undefined');
            return null;
        }

        const userRole = userData.user.role;
        console.log('[LeftToolbar] User role:', userRole);

        return (
            <ul className="toolbar-list">
                <li onClick={handleProfileClick} className="clickable">Profile</li>
                
                {/* Coordinator specific navigation */}
                {userRole === 'Coordinator' && (
                    <>
                        <li onClick={handlePatientsClick} className="clickable">Patients</li>
                        <li onClick={handleCoordinatorTicketsClick} className="clickable">Manage Coordinator Tickets</li>
                        <li onClick={handleCoordinatorHelpdeskClick} className="clickable">Helpdesk Tickets</li>
                    </>
                )}
                
                {/* Administrator specific navigation */}
                {(userRole === 'Administrator' || userRole === 'Administrative') && (
                    <>
                        <li onClick={handleSubmitTicketClick} className="clickable">Submit Ticket</li>
                        <li onClick={handleManageTicketsClick} className="clickable">Manage Tickets</li>
                    </>
                )}
                
                {/* General ticket navigation for all users */}
                <li onClick={handleTicketsClick} className="clickable">Tickets</li>
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
