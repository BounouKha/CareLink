import React, { useState, useEffect } from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import { SpinnerOnly } from './LoadingComponents';
import tokenManager from '../utils/tokenManager';

const PatientInfoModal = ({ appointment, onClose, providerService }) => {
    const [patientDetails, setPatientDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { providers: providersT, common } = useCareTranslation();

    useEffect(() => {
        if (appointment && appointment.patient) {
            fetchPatientDetails();
        }
    }, [appointment]);

    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch detailed patient information using tokenManager
            const token = tokenManager.getAccessToken();
            if (!token) {
                throw new Error('No access token available');
            }

            const response = await fetch(`http://localhost:8000/account/patient-details/${appointment.patient.id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Patient details not found');
                } else if (response.status === 403) {
                    throw new Error('You do not have permission to view this patient\'s details');
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            }

            const data = await response.json();
            setPatientDetails(data);
        } catch (err) {
            console.error('Error fetching patient details:', err);
            setError(err.message || 'Failed to fetch patient details');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            return age - 1;
        }
        return age;
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'completed': return 'badge bg-success';
            case 'confirmed': return 'badge bg-primary';
            case 'cancelled': return 'badge bg-danger';
            case 'no_show': return 'badge bg-warning text-dark';
            case 'in_progress': return 'badge bg-info';
            default: return 'badge bg-secondary';
        }
    };

    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 'N/A';
        
        try {
            // Parse times (format: HH:MM or HH:MM:SS)
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            
            // Calculate difference in minutes
            const diffMs = end - start;
            const diffMinutes = Math.round(diffMs / (1000 * 60));
            
            if (diffMinutes <= 0) return 'N/A';
            
            // Format duration
            if (diffMinutes < 60) {
                return `${diffMinutes} minutes`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                if (minutes === 0) {
                    return `${hours} hour${hours > 1 ? 's' : ''}`;
                } else {
                    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
                }
            }
        } catch (error) {
            console.error('Error calculating duration:', error);
            return 'N/A';
        }
    };

    if (!appointment) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content shadow-lg border-0 bg-white" style={{borderRadius: '20px', overflow: 'hidden'}}>
                    <div className="modal-header">
                        <h2>
                            <i className="fas fa-user-circle me-2"></i>
                            Patient Information
                        </h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>

                    <div className="modal-body p-4 bg-light" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                        {loading ? (
                            <div className="text-center py-4">
                                <SpinnerOnly />
                                <p className="mt-2">Loading patient information...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-4">
                                <i className="fas fa-exclamation-triangle text-danger mb-3" style={{fontSize: '2rem'}}></i>
                                <p className="text-danger">{error}</p>
                                <button className="btn btn-primary btn-sm" onClick={fetchPatientDetails}>
                                    <i className="fas fa-redo me-1"></i>
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Appointment Information */}
                                <div className="mb-4">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="fas fa-calendar-alt me-2 text-primary"></i>
                                        Appointment Details
                                    </h6>
                                    <div className="row">
                                        <div className="col-md-6 mb-2">
                                            <strong>Service:</strong> {appointment.service?.name || 'N/A'}
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Time:</strong> {appointment.start_time} - {appointment.end_time}
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Status:</strong> 
                                            <span className={`ms-2 ${getStatusBadgeClass(appointment.status)}`}>
                                                {appointment.status || 'scheduled'}
                                            </span>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Duration:</strong> {calculateDuration(appointment.start_time, appointment.end_time)}
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Basic Information */}
                                <div className="mb-4">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="fas fa-user me-2 text-success"></i>
                                        Patient Details
                                    </h6>
                                    <div className="row">
                                        <div className="col-md-6 mb-2">
                                            <strong>Full Name:</strong> {appointment.patient?.name || 'N/A'}
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Age:</strong> {formatAge(patientDetails?.birth_date)} years
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Gender:</strong> {patientDetails?.gender || 'N/A'}
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Birth Date:</strong> {formatDate(patientDetails?.birth_date)}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-4">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="fas fa-address-card me-2 text-info"></i>
                                        Contact Information
                                    </h6>
                                    <div className="row">
                                        <div className="col-12 mb-2">
                                            <strong>Address:</strong> {patientDetails?.address || 'No address provided'}
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <strong>Email:</strong> {patientDetails?.email || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Information */}
                                <div className="mb-4">
                                    <h6 className="border-bottom pb-2 mb-3">
                                        <i className="fas fa-heartbeat me-2 text-danger"></i>
                                        Medical Information
                                    </h6>
                                    <div className="row">
                                        <div className="col-md-6 mb-2">
                                            <strong>Emergency Contact:</strong> {
                                                patientDetails?.emergency_contact_name && patientDetails?.emergency_contact_phone 
                                                    ? `${patientDetails.emergency_contact_name} (${patientDetails.emergency_contact_relationship || 'Contact'}) - ${patientDetails.emergency_contact_phone}`
                                                    : 'N/A'
                                            }
                                        </div>
                                        {patientDetails?.illness && (
                                            <div className="col-12 mb-2">
                                                <strong>Medical Conditions:</strong> {patientDetails.illness}
                                            </div>
                                        )}
                                        {patientDetails?.medication && (
                                            <div className="col-12 mb-2">
                                                <strong>Current Medications:</strong> {patientDetails.medication}
                                            </div>
                                        )}
                                        {patientDetails?.critical_information && (
                                            <div className="col-12 mb-2">
                                                <div className="alert alert-warning">
                                                    <strong>
                                                        <i className="fas fa-exclamation-triangle me-1"></i>
                                                        Critical Information:
                                                    </strong>
                                                    <br />
                                                    {patientDetails.critical_information}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Doctor Information - Only for Service 3 providers */}
                                {(providerService?.id === 3 || providerService?.id === '3') && (
                                    <div className="mb-4">
                                        <h6 className="border-bottom pb-2 mb-3">
                                            <i className="fas fa-user-md me-2 text-primary"></i>
                                            Doctor Information
                                        </h6>
                                        <div className="row">
                                            <div className="col-md-6 mb-2">
                                                <strong>Doctor Name:</strong> {patientDetails?.doctor_name || 'Not provided'}
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <strong>Doctor Phone:</strong> {patientDetails?.doctor_phone || 'Not provided'}
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <strong>Doctor Email:</strong> {patientDetails?.doctor_email || 'Not provided'}
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <strong>Doctor Address:</strong> {patientDetails?.doctor_address || 'Not provided'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times me-1"></i>
                            Close
                        </button>
                        {patientDetails?.address && (
                            <a 
                                href={`https://maps.google.com/?q=${encodeURIComponent(patientDetails.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                            >
                                <i className="fas fa-map-marker-alt me-1"></i>
                                View on Map
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientInfoModal; 