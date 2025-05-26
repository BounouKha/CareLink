import React, { useState, useEffect } from 'react';
import './HomePage.css';

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

    const toggleMenu = () => {
        const newMenuState = !isMenuOpen;
        setIsMenuOpen(newMenuState);
        localStorage.setItem('isMenuOpen', newMenuState); // Save to localStorage
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

    return (
        <div className="homepage-container">
            <header className="homepage-header fixed-header">
                <img src="/logo192.png" alt="Logo" className="homepage-logo" />
                <button className="hamburger-menu" onClick={toggleMenu}>
                    ☰
                </button>
                <div className={`homepage-buttons ${isMenuOpen ? 'open' : 'closed'}`}>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/register'}>S'inscrire</button>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Espace membre</button>
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
