import React, { useState } from 'react';
import './CreatePatientModal.css';

const CreatePatientModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        gender: '',
        blood_type: '',
        emergency_contact: '',
        katz_score: '',
        it_score: '',
        illness: '',
        critical_information: '',
        medication: '',
        social_price: false,
        is_alive: true,
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

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/patient/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create patient profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Patient profile created successfully!');
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
                            <i className="fas fa-user-injured me-2 text-success"></i>
                            Create Patient Profile
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-success bg-opacity-10 border-0">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-info-circle me-2 text-success"></i>
                                        Basic Information
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="fas fa-venus-mars me-2 text-muted"></i>
                                                Gender <span className="text-danger">*</span>
                                            </label>
                                            <select 
                                                name="gender" 
                                                className="form-select" 
                                                value={formData.gender} 
                                                onChange={handleChange} 
                                                required
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="M">Male</option>
                                                <option value="F">Female</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="fas fa-tint me-2 text-muted"></i>
                                                Blood Type
                                            </label>
                                            <input 
                                                type="text" 
                                                name="blood_type" 
                                                className="form-control" 
                                                value={formData.blood_type} 
                                                onChange={handleChange}
                                                placeholder="e.g., A+, O-, AB+"
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">
                                                <i className="fas fa-phone me-2 text-muted"></i>
                                                Emergency Contact <span className="text-danger">*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                name="emergency_contact" 
                                                className="form-control" 
                                                value={formData.emergency_contact} 
                                                onChange={handleChange} 
                                                required
                                                placeholder="Emergency contact person and phone number"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-info bg-opacity-10 border-0">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-chart-line me-2 text-info"></i>
                                        Assessment Scores
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="fas fa-clipboard-list me-2 text-muted"></i>
                                                Katz Score
                                            </label>
                                            <input 
                                                type="number" 
                                                name="katz_score" 
                                                className="form-control" 
                                                value={formData.katz_score} 
                                                onChange={handleChange}
                                                placeholder="0-6"
                                            />
                                            <div className="form-text">Activities of Daily Living assessment</div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="fas fa-clipboard-list me-2 text-muted"></i>
                                                IT Score
                                            </label>
                                            <input 
                                                type="number" 
                                                name="it_score" 
                                                className="form-control" 
                                                value={formData.it_score} 
                                                onChange={handleChange}
                                                placeholder="Enter IT assessment score"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-warning bg-opacity-10 border-0">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-stethoscope me-2 text-warning"></i>
                                        Medical Information
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label">
                                                <i className="fas fa-disease me-2 text-muted"></i>
                                                Illness/Condition
                                            </label>
                                            <textarea 
                                                name="illness" 
                                                className="form-control" 
                                                rows="2"
                                                value={formData.illness} 
                                                onChange={handleChange}
                                                placeholder="Primary illness or medical condition"
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">
                                                <i className="fas fa-exclamation-triangle me-2 text-muted"></i>
                                                Critical Information
                                            </label>
                                            <textarea 
                                                name="critical_information" 
                                                className="form-control" 
                                                rows="2"
                                                value={formData.critical_information} 
                                                onChange={handleChange}
                                                placeholder="Important medical alerts or critical information"
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">
                                                <i className="fas fa-pills me-2 text-muted"></i>
                                                Medication
                                            </label>
                                            <textarea 
                                                name="medication" 
                                                className="form-control" 
                                                rows="3"
                                                value={formData.medication} 
                                                onChange={handleChange}
                                                placeholder="Current medications and dosages"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm">
                                <div className="card-header bg-secondary bg-opacity-10 border-0">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-cog me-2 text-secondary"></i>
                                        Additional Settings
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    name="social_price" 
                                                    id="socialPrice"
                                                    checked={formData.social_price} 
                                                    onChange={handleChange}
                                                />
                                                <label className="form-check-label" htmlFor="socialPrice">
                                                    <i className="fas fa-hand-holding-heart me-2 text-muted"></i>
                                                    Social Price Eligible
                                                </label>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    name="is_alive" 
                                                    id="isAlive"
                                                    checked={formData.is_alive} 
                                                    onChange={handleChange}
                                                />
                                                <label className="form-check-label" htmlFor="isAlive">
                                                    <i className="fas fa-heartbeat me-2 text-muted"></i>
                                                    Patient is Active
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-success" form="patientForm">
                            <i className="fas fa-user-plus me-2"></i>
                            Create Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePatientModal;
