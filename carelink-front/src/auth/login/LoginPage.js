import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../layout/BaseLayout';
import tokenManager from '../../utils/tokenManager';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Use translation hooks
    const { auth, common, placeholders, errors } = useCareTranslation();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/account/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });            if (!response.ok) {
                throw new Error(errors('invalidCredentials') || 'Invalid email or password.');
            }const data = await response.json();
            const { access, refresh } = data;
            
            // Use TokenManager to securely store tokens
            tokenManager.setTokens(access, refresh);
            
            console.log('✅ Login successful, tokens stored securely');
            
            // Dispatch custom event to notify other components of login
            window.dispatchEvent(new CustomEvent('user-login'));
            
            // Small delay to ensure admin status is fetched before navigation
            setTimeout(() => {
                navigate('/profile');
            }, 100);
            
        } catch (err) {
            setError(err.message);
        }    };    return (
        <BaseLayout>
            <div className="login-page">                <div className="login-container">
                    <div className="login-header">
                        <h2>{auth('welcomeBack')}</h2>
                        <p className="login-subtitle">{auth('signInSubtitle')}</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">
                                <i className="fas fa-envelope"></i>
                                {auth('emailAddress')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder={placeholders('email')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">
                                <i className="fas fa-lock"></i>
                                {auth('password')}
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder={placeholders('password')}
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
                            {auth('signIn')}
                        </button>
                    </form>
                    
                    <div className="login-footer">
                        <div className="divider">
                            <span>{auth('newToCareLink')}</span>
                        </div>
                        <Link to="/register" className="btn btn-secondary">
                            <i className="fas fa-user-plus"></i>
                            {auth('createAccount')}
                        </Link>
                        
                        <div className="forgot-password">
                            <Link to="/forgot-password">
                                <i className="fas fa-key"></i>
                                {auth('forgotPassword')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default LoginPage;