import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const CreateSocialAssistantModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        is_internal: false,
        from_hospital: '',
    });    const handleChange = (e) => {
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

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/social-assistant/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create social assistant profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Social Assistant profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">
                            <i className="fas fa-hands-helping me-2"></i>
                            Create Social Assistant Profile
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="row g-3">
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header bg-light">
                                        <h6 className="card-title mb-0">
                                            <i className="fas fa-hospital me-2"></i>
                                            Hospital Information
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <form onSubmit={handleSubmit} id="socialAssistantForm">
                                            <div className="mb-3">
                                                <label htmlFor="from_hospital" className="form-label fw-medium">
                                                    <i className="fas fa-building me-2"></i>
                                                    Hospital/Institution *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="from_hospital"
                                                    name="from_hospital"
                                                    className="form-control"
                                                    value={formData.from_hospital}
                                                    onChange={handleChange}
                                                    placeholder="Enter hospital or institution name"
                                                    required
                                                />
                                                <small className="form-text text-muted">
                                                    Specify the hospital or institution this social assistant represents
                                                </small>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header bg-light">
                                        <h6 className="card-title mb-0">
                                            <i className="fas fa-cogs me-2"></i>
                                            Organization Settings
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-0">
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
                                                    Internal Social Assistant
                                                </label>
                                            </div>
                                            <small className="form-text text-muted">
                                                <i className="fas fa-info-circle me-1"></i>
                                                Internal assistants are employed directly by the organization
                                            </small>
                                        </div>
                                    </div>
                                </div>
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
                            form="socialAssistantForm"
                            className="btn btn-success"
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

export default CreateSocialAssistantModal;
