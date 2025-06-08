import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const CreateAdministrativeModal = ({ userId, onClose, onProfileCreated }) => {
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
        console.log('Sending data to backend:', { userId, role_specific_data: formData });
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/administrative/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create administrative profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Administrative profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };    return (
        <div className="modal-overlay">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-user-tie me-2 text-primary"></i>
                            Create Administrative Profile
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="card border-0 shadow-sm">
                                <div className="card-header bg-warning bg-opacity-10 border-0">
                                    <h6 className="card-title mb-0">
                                        <i className="fas fa-cog me-2 text-warning"></i>
                                        Administrative Settings
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="is_internal"
                                            name="is_internal"
                                            checked={formData.is_internal}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label" htmlFor="is_internal">
                                            <strong>Internal Staff Member</strong>
                                            <div className="small text-muted">
                                                Enable if this user is an internal administrative staff member
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                <i className="fas fa-times me-2"></i>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <i className="fas fa-save me-2"></i>
                                Create Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateAdministrativeModal;
