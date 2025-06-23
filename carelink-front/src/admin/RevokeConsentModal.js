import React, { useState } from 'react';
import './RevokeConsentModal.css';

const RevokeConsentModal = ({ show, onClose, consent, onRevoke }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Predefined reasons for quick selection
    const predefinedReasons = [
        'User requested withdrawal via email',
        'User requested withdrawal via phone',
        'User requested withdrawal in person',
        'GDPR data deletion request',
        'Account closure request',
        'Privacy concerns raised',
        'Medical treatment ended',
        'Legal requirement',
        'Other (specify below)'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!reason.trim()) {
            setError('Please provide a reason for revoking consent.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:8000/account/consent/admin/revoke/${consent.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason: reason.trim()
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to revoke consent');
            }

            const result = await response.json();
            onRevoke(consent.id, result);
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    const handlePredefinedReasonSelect = (selectedReason) => {
        setReason(selectedReason);
    };

    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="revoke-consent-modal">
                <div className="modal-header">
                    <h3>🚫 Revoke Consent</h3>
                    <button className="close-btn" onClick={handleClose} disabled={isSubmitting}>
                        ✕
                    </button>
                </div>

                <div className="modal-content">
                    {/* Consent Details */}
                    <div className="consent-details">
                        <h4>Consent Information</h4>
                        <div className="detail-row">
                            <span className="label">User:</span>
                            <span className="value">{consent.user_email || 'Anonymous'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Consent Date:</span>
                            <span className="value">
                                {new Date(consent.consent_timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Current Status:</span>
                            <span className={`status-badge ${consent.status}`}>
                                {consent.status}
                            </span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="warning-box">
                        <div className="warning-icon">⚠️</div>
                        <div className="warning-text">
                            <strong>Important:</strong> Revoking consent will immediately disable all non-essential 
                            cookies for this user. This action is permanent and will be logged for audit purposes.
                        </div>
                    </div>

                    {/* Reason Selection Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="reason">Reason for Revocation *</label>
                            
                            {/* Quick Selection Buttons */}
                            <div className="quick-reasons">
                                {predefinedReasons.map((predefinedReason, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`reason-btn ${reason === predefinedReason ? 'selected' : ''}`}
                                        onClick={() => handlePredefinedReasonSelect(predefinedReason)}
                                        disabled={isSubmitting}
                                    >
                                        {predefinedReason}
                                    </button>
                                ))}
                            </div>

                            {/* Text Area for Custom Reason */}
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter the reason for revoking this consent..."
                                rows="4"
                                required
                                disabled={isSubmitting}
                                className={error ? 'error' : ''}
                            />
                            
                            {error && <div className="error-message">{error}</div>}
                        </div>

                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-danger"
                                disabled={isSubmitting || !reason.trim()}
                            >
                                {isSubmitting ? 'Revoking...' : 'Revoke Consent'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RevokeConsentModal;
