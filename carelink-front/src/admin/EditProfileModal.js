import React from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ profile, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-edit me-2 text-primary"></i>
                            Edit Profile
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body text-center py-5">
                        <div className="mb-4">
                            <i className="fas fa-tools text-muted" style={{fontSize: '4rem', opacity: '0.3'}}></i>
                        </div>
                        <h5 className="mb-3">Edit Functionality Disabled</h5>
                        <p className="text-muted mb-0">
                            Profile editing functionality has been temporarily removed for security purposes.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times me-2"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
