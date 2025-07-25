import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from './BaseLayout';

const HomePage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/account/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid email or password.');
            }

            const data = await response.json();// Debug log
            const { access, refresh, is_superuser } = data;
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
            
            // Dispatch login event
            window.dispatchEvent(new CustomEvent('user-login'));
            
            alert('Login successful!');
            navigate('/profile'); // Redirect to profile page
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <BaseLayout>
            <div className="homepage-container">
                <img src="/homepage.png" alt="Homepage" className="homepage-image" />
                <div className="homepage-text">
                    <h1>Welcome to CareLink</h1>
                    <p>SLOGAN</p>
                </div>
            </div>
        </BaseLayout>
    );
};

export default HomePage;
