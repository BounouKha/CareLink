import React, { useState, useEffect } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './EmailVerificationModal.css';

const EmailVerificationModal = ({ email, isOpen, onClose, onVerified }) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
    const [canResend, setCanResend] = useState(false);
    const { auth, common, errors } = useCareTranslation();

    // Timer countdown
    useEffect(() => {
        if (!isOpen || timeLeft <= 0) {
            if (timeLeft <= 0) {
                setCanResend(true);
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    // Format time display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Input validation to prevent injection
    const sanitizeInput = (input) => {
        // Remove any non-numeric characters and limit to 6 digits
        return input.replace(/[^0-9]/g, '').slice(0, 6);
    };

    const handleCodeChange = (e) => {
        const sanitizedValue = sanitizeInput(e.target.value);
        setVerificationCode(sanitizedValue);
        setError(''); // Clear error when user types
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        
        // Validate input
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit verification code');
            return;
        }

        // Additional security check - ensure only numeric
        if (!/^\d{6}$/.test(verificationCode)) {
            setError('Verification code must contain only numbers');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/account/verify-email/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email, // Email is already validated from parent
                    verification_code: verificationCode
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Success
            onVerified();
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        setError('');
        setCanResend(false);

        try {
            const response = await fetch('http://localhost:8000/account/resend-verification/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Resend failed');
            }

            // Reset timer
            setTimeLeft(300);
            setVerificationCode('');
            alert('Verification code has been resent to your email');
            
        } catch (err) {
            setError(err.message);
            setCanResend(true);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToRegister = () => {
        setVerificationCode('');
        setError('');
        setTimeLeft(300);
        setCanResend(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content verification-modal">
                <div className="modal-header">
                    <h2>Email Verification</h2>
                    <button 
                        className="close-button" 
                        onClick={handleBackToRegister}
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="verification-info">
                        <i className="fas fa-envelope-open verification-icon"></i>
                        <p>
                            We've sent a 6-digit verification code to:<br />
                            <strong>{email}</strong>
                        </p>
                        <p className="verification-subtitle">
                            Please enter the code below to verify your email address.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="verification-form">
                        <div className="form-group">
                            <label htmlFor="verificationCode">Verification Code</label>
                            <input
                                id="verificationCode"
                                name="verificationCode"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={handleCodeChange}
                                maxLength="6"
                                className={`verification-input ${error ? 'error' : ''}`}
                                disabled={loading}
                                autoComplete="off"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-circle"></i>
                                {error}
                            </div>
                        )}

                        <div className="timer-section">
                            {timeLeft > 0 ? (
                                <p className="timer">
                                    <i className="fas fa-clock"></i>
                                    Code expires in: <strong>{formatTime(timeLeft)}</strong>
                                </p>
                            ) : (
                                <p className="timer expired">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    Verification code has expired
                                </p>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="submit"
                                className="verify-button"
                                disabled={loading || verificationCode.length !== 6 || timeLeft <= 0}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check"></i>
                                        Verify Email
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="resend-button"
                                onClick={handleResend}
                                disabled={loading || !canResend}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-redo"></i>
                                        Resend Code
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="back-button"
                                onClick={handleBackToRegister}
                                disabled={loading}
                            >
                                <i className="fas fa-arrow-left"></i>
                                Back to Registration
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationModal;
