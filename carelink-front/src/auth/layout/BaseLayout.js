import React, { useState, useEffect, useContext } from 'react';
import './UnifiedBaseLayout.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LeftToolbar from './LeftToolbar';
import { AdminContext } from '../login/AdminContext';
import { SpinnerOnly } from '../../components/LoadingComponents';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ZoomControl from '../../components/ZoomControl';
import AccessibilityControls from '../../components/AccessibilityControls';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager';

const BaseLayout = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [toolbarVisible, setToolbarVisible] = useState(() => {
        const saved = localStorage.getItem('leftToolbarVisible');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [forceUpdate, setForceUpdate] = useState(0);

    // Get superuser status from AdminContext
    const { isSuperUser, refreshAdminStatus } = useContext(AdminContext);
    const isSuperuser = isSuperUser;

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
        
        const preloadUserData = async () => {
            if (!tokenManager.isAuthenticated()) {
                setLoading(false);
                return;
            }

            try {
                // Only fetch user profile data - AdminContext handles admin status
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
                console.error('Error preloading user data:', error);
            }
            setLoading(false);
        };

        preloadUserData();
    }, []);

    useEffect(() => {
        // Listen for login events to refresh admin status
        const handleLoginEvent = () => {
            console.log('[BaseLayout] Login event detected, refreshing admin status');
            if (refreshAdminStatus) {
                refreshAdminStatus();
            }
        };

        window.addEventListener('user-login', handleLoginEvent);
        
        return () => {
            window.removeEventListener('user-login', handleLoginEvent);
        };
    }, [refreshAdminStatus]);

    // Force re-render when authentication status changes
    useEffect(() => {
        const handleAuthChange = () => {
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('user-login', handleAuthChange);
        window.addEventListener('user-logout', handleAuthChange);
        
        return () => {
            window.removeEventListener('user-login', handleAuthChange);
            window.removeEventListener('user-logout', handleAuthChange);
        };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleMemberAreaClick = () => {
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

    // Remove any automatic authentication redirects for public pages
    // The register page should be accessible without authentication
    
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
    }

    return (
        <div className="homepage-container">
            {isNavigating && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <SpinnerOnly size="large" />
                </div>
            )}
            
            <header className="homepage-header fixed-header">
                <img src="/Logo.png" alt="Logo" className="homepage-logo" style={{ width: '100px', height: 'auto' }} />
                <button className="hamburger-menu" onClick={toggleMenu}>
                    ☰
                </button>
                {isMenuOpen && <div className="hamburger-overlay" onClick={closeMenu}></div>}
                <div className={`homepage-buttons ${isMenuOpen ? 'open' : 'closed'}`}>
                    {isMenuOpen && (
                        <button className="btn btn-secondary close-menu" onClick={closeMenu}>
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => navigateWithLoading('/')}>{common('home')}</button>
                    {!isConnected && (
                        <button className="btn btn-primary" onClick={() => navigateWithLoading('/register')}>{auth('register')}</button>
                    )}
                    {isConnected && (
                        <button className="btn btn-primary" onClick={handleLogout}>{common('logout')}</button>
                    )}
                    <button className="btn btn-primary" onClick={() => {
                        if (tokenManager.isAuthenticated()) {
                            navigateWithLoading('/profile');
                        } else {
                            navigateWithLoading('/login');
                        }
                    }}>{common('memberArea')}</button>
                    {isSuperuser && (
                        <button className="btn btn-secondary" onClick={() => navigateWithLoading('/admin')}>{admin('title')}</button>
                    )}
                    
                    <AccessibilityControls />
                    <ZoomControl />
                    <LanguageSwitcher />
                </div>
            </header>
            {isMemberArea && <LeftToolbar userData={userData} />}
            <main className="homepage-main">
                {children}
            </main>
        </div>
    );
};

export default BaseLayout;
