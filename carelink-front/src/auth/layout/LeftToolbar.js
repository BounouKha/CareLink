import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import { useNavigate } from 'react-router-dom';
import { SpinnerOnly } from '../../components/LoadingComponents';
import { getNavigationItems } from '../../utils/roleUtils';

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
    };    const handleScheduleClick = () => {
        navigateWithLoading('/schedule');
    };

    const handleProvidersClick = () => {
        navigateWithLoading('/providers');
    };

    const handleTicketsClick = () => {
        navigateWithLoading('/tickets');
    };

    const handleHelpdeskClick = () => {
        navigateWithLoading('/coordinator/helpdesk');
    };

    const handleManageTicketsClick = () => {
        navigateWithLoading('/coordinator/tickets');
    };

    const handleProviderScheduleClick = () => {
        navigateWithLoading('/provider/schedule');
    };

    const handleInvoicesClick = () => {
        navigateWithLoading('/invoices');
    };

    const handleCommunicationClick = () => {
        navigateWithLoading('/coordinator/communication');
    };

    const renderRoleSpecificToolbar = () => {
        if (!userData || !userData.user) {
            console.warn('[LeftToolbar] userData or user is undefined');
            return null;
        }

        const navigationItems = getNavigationItems(userData.user, userData);
        
        const handleNavigationClick = (path) => {
            if (path === '/providers') {
                handleProvidersClick();
            } else if (path === '/profile') {
                handleProfileClick();
            } else if (path === '/patients') {
                handlePatientsClick();
            } else if (path === '/service-demands') {
                handleServiceDemandsClick();
            } else if (path === '/schedule') {
                handleScheduleClick();
            } else if (path === '/tickets') {
                handleTicketsClick();
            } else if (path === '/coordinator/helpdesk') {
                handleHelpdeskClick();
            } else if (path === '/coordinator/tickets') {
                handleManageTicketsClick();
            } else if (path === '/coordinator/communication') {
                handleCommunicationClick();
            } else if (path === '/provider/schedule') {
                handleProviderScheduleClick();
            } else if (path === '/invoices') {
                handleInvoicesClick();
            } else {
                navigateWithLoading(path);
            }
        };

        return (
            <ul className="toolbar-list">
                {navigationItems.map(item => (
                    <li 
                        key={item.key}
                        onClick={() => handleNavigationClick(item.path)} 
                        className="clickable"
                    >
                        {item.label}
                    </li>
                ))}
            </ul>
        );
    };return (
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
