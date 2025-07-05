import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../layout/BaseLayout';
import tokenManager from '../../utils/tokenManager';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './LoginPage.css';

const LoginPage = () => {    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Use translation hooks
    const { auth, common, placeholders, errors } = useCareTranslation();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Get anonymous consent ID if it exists
            const anonymousConsentId = localStorage.getItem('carelink_anonymous_consent_id');
            
            const response = await fetch('http://localhost:8000/account/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password,
                    ...(anonymousConsentId && { anonymous_consent_id: anonymousConsentId })
                }),
            });

            // Handle different response statuses
            if (response.status === 423) {
                // Account locked
                const data = await response.json();
                const lockoutInfo = data.lockout_info;
                
                let errorMessage = data.error;
                
                // Use appropriate translated message based on the error
                if (data.error === 'Your account is blocked, contact administrator.') {
                    errorMessage = errors('accountLocked');
                } else if (data.error === 'Account blocked due to many bad information.') {
                    errorMessage = errors('accountBlockedBadInfo');
                } else if (data.error === 'Too many failed attempts. Please wait before trying again.') {
                    errorMessage = errors('tooManyAttempts');
                } else {
                    errorMessage = data.error || errors('accountLocked');
                }
                
                // Only show timer for temporary locks (not permanent blocks)
                if (lockoutInfo && lockoutInfo.minutes_remaining > 0 && !lockoutInfo.is_permanent) {
                    errorMessage += ` ${errors('tryAgainIn').replace('{minutes}', lockoutInfo.minutes_remaining)}`;
                }
                
                setError(errorMessage);
                return;
            } else if (response.status === 401) {
                // Invalid credentials or account lockout warning
                const data = await response.json();
                let errorMessage = data.error || errors('invalidCredentials');
                
                // Check if there's a warning about remaining attempts
                if (data.warning) {
                    errorMessage += ` ${data.warning}`;
                }
                
                setError(errorMessage);
                return;
            } else if (!response.ok) {
                // Other errors
                const data = await response.json();
                throw new Error(data.error || errors('invalidCredentials') || 'Login failed.');
            }

            const data = await response.json();
            const { access, refresh } = data;
            
            // Use TokenManager to securely store tokens
            tokenManager.setTokens(access, refresh);
            console.log('✅ Login successful, tokens stored securely');
            
            // Fetch and store user profile data
            try {
                const profileResponse = await fetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${access}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    
                    // Store user data in localStorage for role-based access
                    localStorage.setItem('userData', JSON.stringify(profileData));
                    console.log('✅ User profile stored in localStorage:', profileData);
                } else {
                    console.warn('⚠️ Failed to fetch user profile, continuing without userData in localStorage');
                }
            } catch (profileError) {
                console.warn('⚠️ Error fetching user profile:', profileError);
                // Continue with login even if profile fetch fails
            }
            
            // Sync any existing localStorage consent to backend
            try {
                const consentManager = (await import('../../utils/consentManager')).default;
                await consentManager.syncLocalConsentOnLogin();
            } catch (consentError) {
                console.warn('⚠️ Failed to sync consent on login:', consentError);
                // Don't block login for consent sync failures
            }
            
            // Dispatch custom event to notify other components of login
            window.dispatchEvent(new CustomEvent('user-login'));
            
            // Small delay to ensure admin status is fetched before navigation
            setTimeout(() => {
                navigate('/profile');
            }, 100);
              } catch (err) {
            setError(err.message);
        }
    };

    return (
        <BaseLayout>
            <div className="login-page">
                <div className="login-container">
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