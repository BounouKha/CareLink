import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../layout/BaseLayout';
import tokenManager from '../../utils/tokenManager';
import './LoginPage.css';

const LoginPage = () => {
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
            }            const data = await response.json();
            const { access, refresh } = data;
            
            // Use TokenManager to securely store tokens
            tokenManager.setTokens(access, refresh);
            
            console.log('✅ Login successful, tokens stored securely');
            navigate('/profile');
        } catch (err) {
            setError(err.message);
        }    };    return (
        <BaseLayout>
            <div className="login-page">
                <div className="login-container">
                    <div className="login-header">
                        <h2>Welcome Back</h2>
                        <p className="login-subtitle">Sign in to your CareLink account</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">
                                <i className="fas fa-envelope"></i>
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">
                                <i className="fas fa-lock"></i>
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        
                        {error && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-triangle"></i>
                                {error}
                            </div>
                        )}
                        
                        <button type="submit" className="btn btn-primary">
                            <i className="fas fa-sign-in-alt"></i>
                            Sign In
                        </button>
                    </form>
                    
                    <div className="login-footer">
                        <div className="divider">
                            <span>New to CareLink?</span>
                        </div>
                        <Link to="/register" className="btn btn-secondary">
                            <i className="fas fa-user-plus"></i>
                            Create Account
                        </Link>
                        
                        <div className="forgot-password">
                            <Link to="/forgot-password">
                                <i className="fas fa-key"></i>
                                Forgot your password?
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default LoginPage;