import React, { useState, useEffect } from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import tokenManager from '../utils/tokenManager';

const DoctorInfo = ({ patientId, userData, userRole }) => {
    const { t } = useCareTranslation();
    const [doctorInfo, setDoctorInfo] = useState({
        doctor_name: '',
        doctor_address: '',
        doctor_phone: '',
        doctor_email: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (patientId) {
            fetchDoctorInfo();
        } else {
            setError('No patient ID provided');
            setLoading(false);
        }
    }, [patientId]);

    const fetchDoctorInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:8000/account/patient-details/${patientId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch doctor info: ${response.status} ${await response.text()}`);
            }

            const data = await response.json();
            setDoctorInfo({
                doctor_name: data.doctor_name || '',
                doctor_address: data.doctor_address || '',
                doctor_phone: data.doctor_phone || '',
                doctor_email: data.doctor_email || ''
            });
        } catch (err) {
            console.error('Error fetching doctor info:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`http://localhost:8000/account/update_patient/${patientId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(doctorInfo)
            });

            if (!response.ok) {
                throw new Error(`Failed to update doctor info: ${response.status}`);
            }

            setIsEditing(false);
            // Show success message
            alert('Doctor information updated successfully!');
        } catch (err) {
            console.error('Error updating doctor info:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset to original values
        fetchDoctorInfo();
    };

    const handleInputChange = (field, value) => {
        setDoctorInfo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="card shadow-sm border-0">
                <div className="card-body text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading Doctor Information</h5>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="alert alert-danger">
                        <h5>Error Loading Doctor Information</h5>
                        <p>{error}</p>
                        <button className="btn btn-outline-danger" onClick={fetchDoctorInfo}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-info bg-opacity-10 border-0">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">
                        <i className="fas fa-user-md me-2 text-info"></i>
                        Doctor Information
                    </h5>
                    <div>
                        {!isEditing ? (
                            <button 
                                className="btn btn-outline-info btn-sm text-white"
                                onClick={() => setIsEditing(true)}
                            >
                                <i className="fas fa-edit me-1"></i>
                                Edit
                            </button>
                        ) : (
                            <div className="btn-group">
                                <button 
                                    className="btn btn-success btn-sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save me-1"></i>
                                            Save
                                        </>
                                    )}
                                </button>
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    <i className="fas fa-times me-1"></i>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="card-body">
                {!isEditing ? (
                    // View Mode
                    <div className="row g-3">
                        {doctorInfo.doctor_name ? (
                            <div className="col-md-6">
                                <label className="form-label text-muted">Doctor Name:</label>
                                <p className="fs-6 fw-medium">{doctorInfo.doctor_name}</p>
                            </div>
                        ) : null}
                        
                        {doctorInfo.doctor_phone ? (
                            <div className="col-md-6">
                                <label className="form-label text-muted">Phone:</label>
                                <p className="fs-6 fw-medium">{doctorInfo.doctor_phone}</p>
                            </div>
                        ) : null}
                        
                        {doctorInfo.doctor_email ? (
                            <div className="col-md-6">
                                <label className="form-label text-muted">Email:</label>
                                <p className="fs-6 fw-medium">{doctorInfo.doctor_email}</p>
                            </div>
                        ) : null}
                        
                        {doctorInfo.doctor_address ? (
                            <div className="col-12">
                                <label className="form-label text-muted">Address:</label>
                                <p className="fs-6 fw-medium">{doctorInfo.doctor_address}</p>
                            </div>
                        ) : null}
                        
                        {!doctorInfo.doctor_name && !doctorInfo.doctor_phone && !doctorInfo.doctor_email && !doctorInfo.doctor_address ? (
                            <div className="col-12">
                                <div className="text-center py-4">
                                    <i className="fas fa-user-md text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">No doctor information available.</p>
                                    <p className="text-muted small">Click "Edit" to add your doctor's information.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    // Edit Mode
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Doctor Name:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={doctorInfo.doctor_name}
                                onChange={(e) => handleInputChange('doctor_name', e.target.value)}
                                placeholder="Enter doctor's name"
                            />
                        </div>
                        
                        <div className="col-md-6">
                            <label className="form-label">Phone:</label>
                            <input
                                type="tel"
                                className="form-control"
                                value={doctorInfo.doctor_phone}
                                onChange={(e) => handleInputChange('doctor_phone', e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </div>
                        
                        <div className="col-md-6">
                            <label className="form-label">Email:</label>
                            <input
                                type="email"
                                className="form-control"
                                value={doctorInfo.doctor_email}
                                onChange={(e) => handleInputChange('doctor_email', e.target.value)}
                                placeholder="Enter email address"
                            />
                        </div>
                        
                        <div className="col-12">
                            <label className="form-label">Address:</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={doctorInfo.doctor_address}
                                onChange={(e) => handleInputChange('doctor_address', e.target.value)}
                                placeholder="Enter doctor's address"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorInfo; 