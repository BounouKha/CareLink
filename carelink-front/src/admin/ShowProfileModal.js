import React, { useEffect, useState } from 'react';
import './ShowProfileModal.css';
import { useAuthenticatedApi } from '../hooks/useAuth';
import tokenManager from '../utils/tokenManager';

const ShowProfileModal = ({ profile, onClose }) => {
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);

    const { get } = useAuthenticatedApi();

    useEffect(() => {
        // For FamilyPatient profiles, we already have the relations data
        // No need to fetch from server, just use the profile data directly
        if (profile.role === 'FamilyPatient' && profile.relations) {
            setDetails({
                firstname: profile.firstname,
                lastname: profile.lastname,
                role: profile.role,
                relations: profile.relations,
                additional_fields: {}
            });
            return;
        }        // For other roles, fetch details from the server
        const fetchDetails = async () => {
            try {
                if (!tokenManager.isAuthenticated()) {
                    throw new Error('User not authenticated. Please log in.');
                }

                const data = await get(`http://localhost:8000/account/profiles/${profile.id}/fetch/${profile.role}/`);
                
                console.log('Fetched data:', data);
                setDetails(data);
            } catch (err) {
                console.error('[ShowProfileModal] Fetch error:', err);
                setError(err.message);
                
                // Handle authentication errors
                if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('not authenticated')) {
                    tokenManager.handleLogout();
                }
            }
        };        fetchDetails();
    }, [profile, get]);

    useEffect(() => {
        console.log('Updated details state:', details);
    }, [details]);    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-user-circle me-2 text-primary"></i>
                            Profile Details
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {error}
                            </div>
                        )}
                        
                        {details ? (
                            <div className="container-fluid">
                                {/* Basic Information Card */}
                                <div className="card border-0 shadow-sm mb-4">
                                    <div className="card-header bg-primary bg-opacity-10 border-0">
                                        <h5 className="card-title mb-0">
                                            <i className="fas fa-user me-2 text-primary"></i>
                                            Basic Information
                                        </h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">First Name:</label>
                                                <p className="fs-6 fw-medium mb-0">{details.firstname}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Last Name:</label>
                                                <p className="fs-6 fw-medium mb-0">{details.lastname}</p>
                                            </div>
                                        </div>
                                    </div>                                </div>

                                {/* Family Patient Relations - Show detailed relations information */}
                                {details.role === 'FamilyPatient' && details.relations && details.relations.length > 0 && (
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-header bg-info bg-opacity-10 border-0">
                                            <h5 className="card-title mb-0">
                                                <i className="fas fa-users me-2 text-info"></i>
                                                Patient Relations
                                            </h5>
                                        </div>
                                        <div className="card-body">
                                            {details.relations.map((relation, index) => (
                                                <div key={index} className={`relation-item ${index !== details.relations.length - 1 ? 'border-bottom pb-3 mb-3' : ''}`}>
                                                    <div className="row g-3">
                                                        <div className="col-md-4">
                                                            <label className="form-label text-muted">Relationship:</label>
                                                            <p className="fs-6 fw-medium mb-0">
                                                                <span className="badge bg-primary bg-opacity-20 text-primary px-3 py-2 text-light">
                                                                    {relation.link}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label text-muted">Patient Name:</label>
                                                            <p className="fs-6 fw-medium mb-0">{relation.patient_name || 'N/A'}</p>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label text-muted">Patient ID:</label>
                                                            <p className="fs-6 fw-medium mb-0">
                                                                <span className="badge bg-secondary bg-opacity-20 text-secondary px-2 py-1 text-light">
                                                                    #{relation.patient_id || 'N/A'}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-3 pt-3 border-top">
                                                <small className="text-muted">
                                                    <i className="fas fa-info-circle me-1"></i>
                                                    Total Relations: <strong>{details.relations.length}</strong>
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Linked Patient Information */}
                                {details.patient && (
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-header bg-success bg-opacity-10 border-0">
                                            <h5 className="card-title mb-0">
                                                <i className="fas fa-user-injured me-2 text-success"></i>
                                                Linked Patient Information
                                            </h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label text-muted">Patient First Name:</label>
                                                    <p className="fs-6 fw-medium mb-0">{details.patient.firstname}</p>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label text-muted">Patient Last Name:</label>
                                                    <p className="fs-6 fw-medium mb-0">{details.patient.lastname}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Additional Fields */}
                                {details.additional_fields && Object.keys(details.additional_fields).length > 0 && (
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-header bg-info bg-opacity-10 border-0">
                                            <h5 className="card-title mb-0">
                                                <i className="fas fa-info-circle me-2 text-info"></i>
                                                Additional Information
                                            </h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="row g-3">
                                                {Object.entries(details.additional_fields).map(([key, value]) => (
                                                    <div key={key} className="col-12">
                                                        <div className="card bg-light border-0">
                                                            <div className="card-body py-3">
                                                                <label className="form-label text-muted text-capitalize">
                                                                    {key.replace(/_/g, ' ')}:
                                                                </label>
                                                                <div className="fs-6 fw-medium mb-0">
                                                                    {key === 'is_internal' ? (
                                                                        <span className={`badge ${value ? 'bg-success' : 'bg-secondary'}`}>
                                                                            {value ? 'Yes' : 'No'}
                                                                        </span>
                                                                    ) : key === 'service' ? (
                                                                        <div>
                                                                            <small className="text-muted">ID:</small> {value.id}<br/>
                                                                            <small className="text-muted">Name:</small> {value.name}
                                                                        </div>
                                                                    ) : key === 'familypatient' ? (
                                                                        <div>
                                                                            <small className="text-muted">ID:</small> {value.id}<br/>
                                                                            <small className="text-muted">Name:</small> {value.firstname} {value.lastname}
                                                                            {value.patient_id && value.patient_user && (
                                                                                <div className="mt-2 pt-2 border-top">
                                                                                    <small className="text-muted">Linked Patient ID:</small> {value.patient_id}<br/>
                                                                                    <small className="text-muted">Linked User:</small> {value.patient_user.firstname} {value.patient_user.lastname}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : typeof value === 'object' ? (
                                                                        <pre className="small text-muted">{JSON.stringify(value, null, 2)}</pre>
                                                                    ) : (
                                                                        value
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3 text-muted">Loading profile details...</p>
                            </div>
                        )}
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

export default ShowProfileModal;
