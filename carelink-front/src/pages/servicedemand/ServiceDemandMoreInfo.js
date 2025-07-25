import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const ServiceDemandMoreInfo = ({ 
    selectedDemand, 
    userData, 
    onClose, 
    onStatusUpdate, 
    onAddComment,
    newComment,
    setNewComment 
}) => {
    // Use translation hooks
    const { servicedemands, common } = useCareTranslation();

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-warning text-dark';
            case 'under review': return 'bg-info text-white';
            case 'approved': return 'bg-success text-white';
            case 'in progress': return 'bg-primary text-white';
            case 'completed': return 'bg-success text-white';
            case 'rejected': return 'bg-danger text-white';
            case 'cancelled': return 'bg-secondary text-white';
            default: return 'bg-secondary text-white';
        }
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'low': return 'bg-success text-white';
            case 'normal': return 'bg-info text-white';
            case 'high': return 'bg-warning text-dark';
            case 'urgent': return 'bg-danger text-white';
            default: return 'bg-secondary text-white';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" >
                <div className="modal-content shadow-lg border-0 bg-white" style={{borderRadius: '20px', overflow: 'hidden', }}>
                    {/* Modal Header */}
                    <div className="modal-header bg-gradient text-muted border-2 p-4" style={{background: 'linear-gradient(135deg, #22C7EE 0%, #1BA8CA 100%)'}}>
                        <div className="d-flex align-items-center">
                            <div>
                                <h4 className="modal-title mb-0 fw-bold">{servicedemands('serviceDemandDetails')}</h4>
                                <small className="opacity-100 fw-bold">{common('title')}: {selectedDemand.title}</small>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                            aria-label="Close"
                            style={{borderRadius: '50%', width: '40px', height: '40px', padding: '10px'}}
                        ></button>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="modal-body p-4 bg-light" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                        
                        {/* Basic Information */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-clipboard-data-fill text-info"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">{common('basicInformation')}</h5>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-collection me-2" style={{color: '#22C7EE'}}></i>
                                                        {servicedemands('service')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.service_info?.name || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-person-fill me-2" style={{color: '#22C7EE'}}></i>
                                                        {servicedemands('patient')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.patient_info?.firstname} {selectedDemand.patient_info?.lastname}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-exclamation-triangle me-2" style={{color: '#ff9800'}}></i>
                                                        {servicedemands('priority')}
                                                    </label>
                                                    <div className="form-control-static p-3">
                                                        <span className={`badge ${getPriorityBadgeClass(selectedDemand.priority)} px-3 py-2 rounded-pill`}>
                                                            {selectedDemand.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-info-circle me-2" style={{color: '#2196f3'}}></i>
                                                        {servicedemands('status')}
                                                    </label>
                                                    <div className="form-control-static p-3">
                                                        <span className={`badge ${getStatusBadgeClass(selectedDemand.status)} px-3 py-2 rounded-pill`}>
                                                            {selectedDemand.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Service Details */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-card-text text-primary"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">{servicedemands('serviceDetails')}</h5>
                                        </div>
                                        <div className="row">
                                            <div className="col-12">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-card-heading me-2" style={{color: '#22C7EE'}}></i>
                                                        {servicedemands('requestTitle')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.title}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-card-text me-2" style={{color: '#22C7EE'}}></i>
                                                        {servicedemands('description')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.description}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedDemand.reason && (
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-heart-pulse me-2" style={{color: '#f44336'}}></i>
                                                            {servicedemands('reason')}
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.reason}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scheduling Information */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-calendar-check text-warning"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">{servicedemands('schedulingInformation')}</h5>
                                        </div>
                                        <div className="row">
                                            {selectedDemand.preferred_start_date && (
                                                <div className="col-md-4">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-calendar-event me-2" style={{color: '#4caf50'}}></i>
                                                            {servicedemands('preferredStartDate')}
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {new Date(selectedDemand.preferred_start_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-arrow-repeat me-2" style={{color: '#9c27b0'}}></i>
                                                        {servicedemands('frequency')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.frequency}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedDemand.duration_weeks && (
                                                <div className="col-md-4">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-hourglass-split me-2" style={{color: '#ff9800'}}></i>
                                                            {servicedemands('duration')}
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.duration_weeks} {common('weeks')}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDemand.preferred_time && (
                                                <div className="col-md-6">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-clock me-2" style={{color: '#4caf50'}}></i>
                                                            {servicedemands('preferredTime')}
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.preferred_time}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-telephone me-2" style={{color: '#2196f3'}}></i>
                                                        {servicedemands('contactMethod')}
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border">
                                                        {selectedDemand.contact_method}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        {selectedDemand.emergency_contact && (
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="card border shadow-sm bg-white">
                                        <div className="card-body p-4 bg-white">
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="bi bi-telephone-fill text-warning"></i>
                                                </div>
                                                <h5 className="mb-0 text-dark fw-bold">{servicedemands('contactInfo')}</h5>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold text-muted">
                                                    <i className="bi bi-telephone-fill me-2" style={{color: '#f44336'}}></i>
                                                    {servicedemands('emergencyContact')}
                                                </label>
                                                <div className="form-control-static p-3 bg-light rounded border">
                                                    {selectedDemand.emergency_contact}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Coordinator Notes */}
                        {selectedDemand.coordinator_notes && (
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="card border shadow-sm bg-white">
                                        <div className="card-body p-4 bg-white">
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="bi bi-chat-square-text-fill text-success"></i>
                                                </div>
                                                <h5 className="mb-0 text-dark fw-bold">
                                                    {userData?.user?.role === 'Patient' ? servicedemands('updatesFromCareTeam') : servicedemands('coordinatorNotes')}
                                                </h5>
                                            </div>
                                            <div className="bg-light p-3 rounded border">
                                                {selectedDemand.coordinator_notes.split('\n\n').map((note, index) => (
                                                    <div key={index} className="mb-2 p-3 bg-white rounded border-start border-success border-3 shadow-sm">
                                                        {note}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comments Section */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-secondary bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-chat-dots-fill text-secondary"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">Comments</h5>
                                        </div>
                                        
                                        {/* Existing Comments */}
                                        <div className="mb-3">
                                            {selectedDemand.comments && selectedDemand.comments.length > 0 ? (
                                                selectedDemand.comments.map((comment, index) => (
                                                    <div key={index} className="mb-2 p-3 bg-light rounded border shadow-sm">
                                                        {comment}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-muted">No comments yet.</p>
                                            )}
                                        </div>

                                        {/* Add Comment Form */}
                                        {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                            <div className="border-top pt-3">
                                                <label className="form-label fw-semibold text-muted">
                                                    <i className="bi bi-plus-circle me-2" style={{color: '#22C7EE'}}></i>
                                                    Add Comment
                                                </label>
                                                <textarea
                                                    className="form-control border-2 shadow-sm mb-3"
                                                    style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                    rows="3"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Add a comment or note about this demand..."
                                                />
                                                <button 
                                                    className="btn btn-sm text-white fw-bold"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #22C7EE 0%, #1BA8CA 100%)',
                                                        border: 'none',
                                                        borderRadius: '8px'
                                                    }}
                                                    onClick={() => {
                                                        if (newComment.trim()) {
                                                            onAddComment(selectedDemand.id, newComment);
                                                        }
                                                    }}
                                                    disabled={!newComment.trim()}
                                                >
                                                    <i className="bi bi-send-fill me-2"></i>
                                                    {servicedemands('addComment')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Management */}
                        {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="card border shadow-sm bg-white">
                                        <div className="card-body p-4 bg-white">
                                            <div className="d-flex align-items-center mb-3">
                                                <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                                                    <i className="bi bi-gear-fill text-danger"></i>
                                                </div>
                                                <h5 className="mb-0 text-dark fw-bold">Status Management</h5>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                <button 
                                                    className="btn btn-info btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Under Review')}
                                                    disabled={selectedDemand.status === 'Under Review'}
                                                >
                                                    {servicedemands('statusOptions.underReview')}
                                                </button>
                                                <button 
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Approved')}
                                                    disabled={selectedDemand.status === 'Approved'}
                                                >
                                                    {servicedemands('statusOptions.approved')}
                                                </button>
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'In Progress')}
                                                    disabled={selectedDemand.status === 'In Progress'}
                                                >
                                                    {servicedemands('statusOptions.inProgress')}
                                                </button>
                                                <button 
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Completed')}
                                                    disabled={selectedDemand.status === 'Completed'}
                                                >
                                                    {servicedemands('statusOptions.completed')}
                                                </button>
                                                <button 
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Rejected')}
                                                    disabled={selectedDemand.status === 'Rejected'}
                                                >
                                                    {servicedemands('statusOptions.rejected')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-dark bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-clock-history text-dark"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">{servicedemands('timeline')}</h5>
                                        </div>
                                        <div className="timeline">
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="badge bg-primary me-3">{servicedemands('created')}</span>
                                                <span>{new Date(selectedDemand.created_at).toLocaleString()}</span>
                                            </div>
                                            {selectedDemand.reviewed_at && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-info me-3">{servicedemands('statusOptions.underReview')}</span>
                                                    <span>{new Date(selectedDemand.reviewed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.completed_at && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-success me-3">{servicedemands('statusOptions.completed')}</span>
                                                    <span>{new Date(selectedDemand.completed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.managed_by_info && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-secondary me-3">{servicedemands('managedBy')}</span>
                                                    <span>{selectedDemand.managed_by_info.firstname} {selectedDemand.managed_by_info.lastname}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="modal-footer border-0 p-4 bg-white" style={{borderRadius: '0 0 20px 20px'}}>
                        <button 
                            type="button" 
                            className="btn btn-secondary btn-lg"
                            style={{borderRadius: '12px'}}
                            onClick={onClose}
                        >
                            <i className="bi bi-x-circle me-2"></i>
                            {common('close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceDemandMoreInfo;
