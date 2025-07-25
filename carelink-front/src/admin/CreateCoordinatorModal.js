import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const CreateCoordinatorModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        is_internal: true,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/coordinator/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create coordinator profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Coordinator profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">                        <h4 className="modal-title">
                            <i className="fas fa-user-tie me-2 text-info"></i>
                            Create Coordinator Profile
                        </h4>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="card">
                            <div className="card-header bg-light">
                                <h6 className="card-title mb-0">
                                    <i className="fas fa-cogs me-2"></i>
                                    Coordinator Settings
                                </h6>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit} id="coordinatorForm">
                                    <div className="mb-3">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="is_internal"
                                                name="is_internal"
                                                checked={formData.is_internal}
                                                onChange={handleChange}
                                            />
                                            <label className="form-check-label fw-medium" htmlFor="is_internal">
                                                Internal Coordinator
                                            </label>
                                        </div>
                                        <small className="form-text text-muted">
                                            <i className="fas fa-info-circle me-1"></i>
                                            Internal coordinators are employed directly by the organization
                                        </small>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="coordinatorForm"
                            className="btn btn-info"
                        >
                            <i className="fas fa-user-plus me-2"></i>
                            Create Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCoordinatorModal;
