import React from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import './WaitingForActivation.css';

const WaitingForActivation = ({ 
    section, 
    message, 
    showRequestButton = false, 
    onRequestActivation,
    requestLoading = false 
}) => {
    const { common } = useCareTranslation();

    const handleRequestActivation = async () => {
        if (onRequestActivation) {
            const result = await onRequestActivation();
            if (result.success) {
                // Show success message
                alert(result.message || 'Activation request submitted successfully');
            } else {
                // Show error message
                alert(result.error || 'Failed to submit activation request');
            }
        }
    };

    return (
        <div className="waiting-activation-container">
            <div className="waiting-activation-content">
                <div className="waiting-icon">
                    <i className="fas fa-hourglass-half"></i>
                </div>
                
                <div className="waiting-message">
                    <h3>{common('waitingForActivation') || 'Waiting for Activation'}</h3>
                    <p>{message || 'Your account is being set up by our administrators.'}</p>
                </div>

                {showRequestButton && (
                    <div className="waiting-actions">
                        <button 
                            className="btn btn-primary request-activation-btn"
                            onClick={handleRequestActivation}
                            disabled={requestLoading}
                        >
                            {requestLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    {common('requesting') || 'Requesting...'}
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-paper-plane"></i>
                                    {common('requestActivation') || 'Request Activation'}
                                </>
                            )}
                        </button>
                        
                        <p className="request-info">
                            {common('activationRequestInfo') || 'This will notify administrators to set up your profile.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaitingForActivation;
