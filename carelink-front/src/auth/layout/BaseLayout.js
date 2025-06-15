import React, { useState, useEffect, useContext } from 'react';
import './UnifiedBaseLayout.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LeftToolbar from './LeftToolbar';
import { AdminContext } from '../login/AdminContext';
import { SpinnerOnly } from '../../components/LoadingComponents';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager'; // Import the new token manager

const BaseLayout = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [loading, setLoading] = useState(true); // Add loading state
    const [userData, setUserData] = useState(null); // Add userData state
    const [isNavigating, setIsNavigating] = useState(false); // Add navigation loading state
    const [toolbarVisible, setToolbarVisible] = useState(() => {
        // Initialize from localStorage, default to true
        const saved = localStorage.getItem('leftToolbarVisible');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const { isSuperUser } = useContext(AdminContext);
    const { common, auth, admin } = useCareTranslation();

    // Listen for toolbar visibility changes
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('leftToolbarVisible');
            setToolbarVisible(saved !== null ? JSON.parse(saved) : true);
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Also listen for direct updates to localStorage
        const interval = setInterval(() => {
            const saved = localStorage.getItem('leftToolbarVisible');
            const newVisible = saved !== null ? JSON.parse(saved) : true;
            if (newVisible !== toolbarVisible) {
                setToolbarVisible(newVisible);
            }
        }, 100);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [toolbarVisible]);

    useEffect(() => {
        // Restore menu state from localStorage on page load
        const savedMenuState = localStorage.getItem('isMenuOpen') === 'true';
        setIsMenuOpen(savedMenuState);

        // Restore zoom level from localStorage on page load
        const savedZoom = parseFloat(localStorage.getItem('zoomLevel')) || 1;
        document.body.style.zoom = savedZoom.toString();
    }, []);    useEffect(() => {
        // Remove old manual token refresh logic - now handled by TokenManager
        // TokenManager automatically monitors and refreshes tokens
        
        const preloadAdminStatus = async () => {
            if (!tokenManager.isAuthenticated()) {
                setLoading(false);
                return;
            }

            try {
                // Use authenticated fetch for admin status check
                const response = await tokenManager.authenticatedFetch('http://localhost:8000/account/check-admin/', {
                    method: 'GET',
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsSuperuser(data.is_superuser);
                    console.log('Admin status preloaded:', data.is_superuser);
                } else {
                    console.error('Failed to preload admin status');
                }

                // Fetch user profile data with authenticated request
                const profileResponse = await tokenManager.authenticatedFetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    setUserData(profileData);
                    console.log('User data loaded:', profileData);
                } else {
                    console.error('Failed to load user profile');
                }
            } catch (error) {
                console.error('Error preloading data:', error);
                // Error is handled by TokenManager (logout if needed)
            }
            setLoading(false);
        };

        preloadAdminStatus();
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const increaseZoom = () => {
        const currentZoom = parseFloat(localStorage.getItem('zoomLevel')) || 1;
        const newZoom = Math.min(currentZoom + 0.1, 2); // Max zoom level: 200%
        document.body.style.zoom = newZoom.toString();
        localStorage.setItem('zoomLevel', newZoom);
    };

    const decreaseZoom = () => {
        const currentZoom = parseFloat(localStorage.getItem('zoomLevel')) || 1;
        const newZoom = Math.max(currentZoom - 0.1, 0.5); // Min zoom level: 50%
        document.body.style.zoom = newZoom.toString();
        localStorage.setItem('zoomLevel', newZoom);
    };    const handleMemberAreaClick = () => {
        if (tokenManager.isAuthenticated()) {
            window.location.href = '/profile';
        } else {
            window.location.href = '/login';
        }
    };const handleLogout = () => {
        // Use TokenManager for secure logout
        tokenManager.handleLogout();
    };

    // Navigation helper with loading
    const navigateWithLoading = (url, delay = 300) => {
        setIsNavigating(true);
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    };

    const isConnected = tokenManager.isAuthenticated();
    const isMemberArea = ['/profile', '/patients', '/service-demands', '/schedule'].some(path => 
        window.location.pathname.startsWith(path)
    ); // Include all member area routes

    if (loading) {
        return (
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
                zIndex: 9999
            }}>
                <SpinnerOnly size="large" />
            </div>
        );
    }    return (
        <div className="homepage-container">
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
            
            <header className="homepage-header fixed-header">
                <img src="/Logo.png" alt="Logo" className="homepage-logo" style={{ width: '100px', height: 'auto' }} />
                <button className="hamburger-menu" onClick={toggleMenu}>
                    ☰
                </button>{isMenuOpen && <div className="hamburger-overlay" onClick={closeMenu}></div>}
                <div className={`homepage-buttons ${isMenuOpen ? 'open' : 'closed'}`}>
                    {isMenuOpen && (
                        <button className="btn btn-secondary close-menu" onClick={closeMenu}>
                            <i className="bi bi-x"></i>
                        </button>                    )}                    <button className="btn btn-primary" onClick={() => navigateWithLoading('/')}>{common('home')}</button>
                    {!isConnected && (
                        <button className="btn btn-primary" onClick={() => navigateWithLoading('/register')}>{auth('register')}</button>
                    )}                    {isConnected && (
                        <button className="btn btn-primary" onClick={handleLogout}>{common('logout')}</button>                    )}
                    <button className="btn btn-primary" onClick={() => {
                        if (tokenManager.isAuthenticated()) {
                            navigateWithLoading('/profile');
                        } else {
                            navigateWithLoading('/login');
                        }                    }}>{common('memberArea')}</button>
                    {isSuperuser && (
                        <button className="btn btn-secondary" onClick={() => navigateWithLoading('/admin')}>{admin('title')}</button>
                    )}                    <button className="btn btn-secondary" onClick={increaseZoom}>[+]</button>
                    <button className="btn btn-secondary" onClick={decreaseZoom}>[-]</button>
                    
                    {/* Language Switcher in header */}
                    <LanguageSwitcher />
                </div>
            </header>            {isMemberArea && <LeftToolbar userData={userData} />}
            <main className="homepage-main">
                {children}
            </main>
        </div>
    );
};

export default BaseLayout;
