import React, { useState, useEffect } from 'react';
import './HomePage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const BaseLayout = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        const interval = setInterval(refreshToken, 4 * 60 * 1000); // Refresh every 4 minutes
        return () => clearInterval(interval);
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
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
    };

    const isConnected = !!localStorage.getItem('accessToken');

    return (
        <div className="homepage-container">
            <header className="homepage-header fixed-header">
                <img src="/Logo.png" alt="Logo" className="homepage-logo" style={{ width: '100px', height: 'auto' }} />
                <button className="hamburger-menu" onClick={toggleMenu}>
                    ☰
                </button>
                {isMenuOpen && <div className="hamburger-overlay" onClick={closeMenu}></div>}
                <div className={`homepage-buttons ${isMenuOpen ? 'open' : 'closed'}`}>
                    <button className="btn btn-secondary close-menu" onClick={closeMenu}>
                        <i className="bi bi-x"></i>
                    </button>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Home</button>
                    {!isConnected && (
                        <button className="btn btn-primary" onClick={() => window.location.href = '/register'}>Register</button>
                    )}
                    {isConnected && (
                        <button className="btn btn-primary" onClick={handleLogout}>Logout</button>
                    )}
                    <button className="btn btn-primary" onClick={handleMemberAreaClick}>Member Area</button>
                    <button className="btn btn-secondary" onClick={increaseZoom}>[+]</button>
                    <button className="btn btn-secondary" onClick={decreaseZoom}>[-]</button>
                </div>
            </header>
            <main className="homepage-main">
                {children}
            </main>
        </div>
    );
};

export default BaseLayout;
