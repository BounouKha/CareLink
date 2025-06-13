import React, { useState, useEffect, useContext } from 'react';
import './UnifiedBaseLayout.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LeftToolbar from './LeftToolbar';
import { AdminContext } from '../login/AdminContext';
import { SpinnerOnly } from '../../components/LoadingComponents';

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
    }, []);

    useEffect(() => {
        const refreshToken = async () => {
            const refresh = localStorage.getItem('refreshToken');
            if (!refresh) return;

            try {
                const response = await fetch('http://localhost:8000/account/token/refresh/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh }),
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('accessToken', data.access);
                } else {
                    console.error('Failed to refresh token');
                }
            } catch (error) {
                console.error('Error refreshing token:', error);
            }
        };

        const interval = setInterval(refreshToken, 59 * 60 * 1000); // Refresh every 59 minutes
        return () => clearInterval(interval);
    }, []);    useEffect(() => {
        const preloadAdminStatus = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const response = await fetch('http://localhost:8000/account/check-admin/', {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setIsSuperuser(data.is_superuser);
                        console.log('Admin status preloaded:', data.is_superuser);
                    } else {
                        console.error('Failed to preload admin status');
                    }

                    // Fetch user profile data
                    const profileResponse = await fetch('http://localhost:8000/account/profile/', {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        setUserData(profileData);
                        console.log('User data loaded:', profileData);
                    } else {
                        console.error('Failed to load user profile');
                    }
                } catch (error) {
                    console.error('Error preloading admin status:', error);
                }
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
    };

    const handleMemberAreaClick = () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            window.location.href = '/profile';
        } else {
            window.location.href = '/login';
        }
    };    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
    };

    // Navigation helper with loading
    const navigateWithLoading = (url, delay = 300) => {
        setIsNavigating(true);
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    };

    const isConnected = !!localStorage.getItem('accessToken');
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
                        </button>
                    )}                    <button className="btn btn-primary" onClick={() => navigateWithLoading('/')}>Home</button>
                    {!isConnected && (
                        <button className="btn btn-primary" onClick={() => navigateWithLoading('/register')}>Register</button>
                    )}
                    {isConnected && (
                        <button className="btn btn-primary" onClick={handleLogout}>Logout</button>
                    )}
                    <button className="btn btn-primary" onClick={() => {
                        const token = localStorage.getItem('accessToken');
                        if (token) {
                            navigateWithLoading('/profile');
                        } else {
                            navigateWithLoading('/login');
                        }
                    }}>Member Area</button>
                    {isSuperuser && (
                        <button className="btn btn-secondary" onClick={() => navigateWithLoading('/admin')}>Admin</button>
                    )}
                    <button className="btn btn-secondary" onClick={increaseZoom}>[+]</button>
                    <button className="btn btn-secondary" onClick={decreaseZoom}>[-]</button>
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
