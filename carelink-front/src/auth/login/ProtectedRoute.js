import React, { useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminContext } from './AdminContext';
import tokenManager from '../../utils/tokenManager';

const ProtectedRoute = ({ children }) => {
    const { isSuperUser } = useContext(AdminContext);
    const [showDeniedMessage, setShowDeniedMessage] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(3);

    // Function to send security alert to backend
    const sendSecurityAlert = async () => {
        try {
            const response = await fetch('http://localhost:8000/account/security/frontend-intrusion/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenManager.getAccessToken() || ''}`,
                },
                body: JSON.stringify({
                    alert_type: 'frontend_admin_access_attempt',
                    path: window.location.pathname,
                    timestamp: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                    referrer: document.referrer || 'direct',
                    ip_info: 'client-side', // Backend will get actual IP
                })
            });

            if (response.ok) {
                console.log('🔍 Security alert sent to backend');
            } else {
                console.warn('⚠️ Failed to send security alert:', response.status);
            }
        } catch (error) {
            console.error('🚨 Error sending security alert:', error);
        }
    };

    useEffect(() => {
        // If user is not a superuser (and not still loading), show denial message
        if (isSuperUser === false) {
            setShowDeniedMessage(true);
            
            // 🔒 Send security alert for unauthorized admin access attempt
            console.log('🚨 Unauthorized admin access attempt detected - sending security alert');
            sendSecurityAlert();
            
            // Start countdown
            const interval = setInterval(() => {
                setRedirectCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isSuperUser]);

    if (isSuperUser === null) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={{
                    fontSize: '18px',
                    color: '#666',
                    marginBottom: '20px'
                }}>
                    🔐 Checking admin permissions...
                </div>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #22C7EE',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (showDeniedMessage && redirectCountdown > 0) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    border: '2px solid #ffebee',
                    maxWidth: '500px',
                    margin: '20px'
                }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '20px'
                    }}>
                        🚫
                    </div>
                    <h2 style={{
                        color: '#d32f2f',
                        marginBottom: '16px',
                        fontSize: '24px',
                        fontWeight: '600'
                    }}>
                        Permission Denied
                    </h2>
                    <p style={{
                        color: '#666',
                        marginBottom: '24px',
                        fontSize: '16px',
                        lineHeight: '1.5'
                    }}>
                        You don't have administrator privileges to access this area.
                        <br />
                        Contact your system administrator for access.
                    </p>
                    <div style={{
                        background: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <p style={{
                            margin: '0',
                            color: '#888',
                            fontSize: '14px'
                        }}>
                            Redirecting to home page in <strong style={{ color: '#d32f2f' }}>{redirectCountdown}</strong> seconds...
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            background: 'linear-gradient(135deg, #22C7EE 0%, #1a9bb8 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(34, 199, 238, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        Go to Home Page Now
                    </button>
                </div>
            </div>
        );
    }

    if (!isSuperUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
