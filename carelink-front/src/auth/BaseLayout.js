import React from 'react';
import './HomePage.css';

const BaseLayout = ({ children }) => {
    return (
        <div className="homepage-container">
            <header className="homepage-header fixed-header">
                <img src="/logo192.png" alt="Logo" className="homepage-logo" />
                <div className="homepage-buttons">
                    <button className="btn" onClick={() => window.location.href = '/register'}>S'inscrire</button>
                    <button className="btn" onClick={() => window.location.href = '/'}>Espace membre</button>
                </div>
            </header>
            <main className="homepage-main">
                {children}
            </main>
        </div>
    );
};

export default BaseLayout;
