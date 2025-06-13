import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const CreateProviderModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        service: '',
        is_internal: true,
    });
    const [services, setServices] = useState([]);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('No access token found. Please log in.');
                }

                const response = await fetch('http://localhost:8000/account/services/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch services.');
                }

                const data = await response.json();
                setServices(data);
            } catch (err) {
                console.error(err);
                alert(err.message);
            }
        };

        fetchServices();
    }, []);    const handleChange = (e) => {
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

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/provider/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create provider profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Provider profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-user-md me-2 text-primary"></i>
                            Create Provider Profile
                        </h4>
                        <button 
                            type="button" 
                            className="btn-close" 
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
                                            <i className="fas fa-stethoscope me-2"></i>
                                            Service Information
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <form onSubmit={handleSubmit} id="providerForm">
                                            <div className="mb-3">
                                                <label htmlFor="service" className="form-label fw-medium">
                                                    <i className="fas fa-briefcase-medical me-2"></i>
                                                    Service *
                                                </label>
                                                <select
                                                    id="service"
                                                    name="service"
                                                    className="form-select"
                                                    value={formData.service}
                                                    onChange={handleChange}
                                                    required
                                                >
                                                    <option value="">Select a Service</option>
                                                    {services.map((service) => (
                                                        <option key={service.id} value={service.id}>
                                                            {service.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <small className="form-text text-muted">
                                                    Choose the service this provider will offer
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
                                            <i className="fas fa-building me-2"></i>
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
                                                    Internal Provider
                                                </label>
                                            </div>
                                            <small className="form-text text-muted">
                                                <i className="fas fa-info-circle me-1"></i>
                                                Internal providers are employed directly by the organization
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
                            form="providerForm"
                            className="btn btn-primary"
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

export default CreateProviderModal;
