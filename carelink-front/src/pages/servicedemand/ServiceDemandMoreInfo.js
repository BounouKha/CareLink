
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const ServiceDemandMoreInfo = ({ 
    selectedDemand, 
    userData, 
    onClose, 
    onStatusUpdate, 
    onAddComment,
    newComment,
    setNewComment 
}) => {
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
                                <h4 className="modal-title mb-0 fw-bold">Service Demand Details</h4>
                                <small className="opacity-100 fw-bold">Title : {selectedDemand.title}</small>
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
                                            <h5 className="mb-0 text-dark fw-bold">Basic Information</h5>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-collection me-2" style={{color: '#22C7EE'}}></i>
                                                        Service
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
                                                        Patient
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
                                                        Priority
                                                    </label>
                                                    <div className="form-control-static p-3">
                                                        <span className={`badge ${getPriorityBadgeClass(selectedDemand.priority)} fs-6`}>
                                                            {selectedDemand.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-flag-fill me-2" style={{color: '#4caf50'}}></i>
                                                        Current Status
                                                    </label>
                                                    <div className="form-control-static p-3">
                                                        <span className={`badge ${getStatusBadgeClass(selectedDemand.status)} fs-6`}>
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

                        {/* Description & Requirements */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="card border shadow-sm bg-white">
                                    <div className="card-body p-4 bg-white">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-file-text-fill text-primary"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">Description & Requirements</h5>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-file-text me-2" style={{color: '#22C7EE'}}></i>
                                                        Description
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border" style={{minHeight: '80px'}}>
                                                        {selectedDemand.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-heart-pulse me-2" style={{color: '#e91e63'}}></i>
                                                        Medical Reason
                                                    </label>
                                                    <div className="form-control-static p-3 bg-light rounded border" style={{minHeight: '80px'}}>
                                                        {selectedDemand.reason}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedDemand.special_instructions && (
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-chat-dots me-2" style={{color: '#22C7EE'}}></i>
                                                            Special Instructions
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.special_instructions}
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
                                            <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                                                <i className="bi bi-calendar-event-fill text-danger"></i>
                                            </div>
                                            <h5 className="mb-0 text-dark fw-bold">Scheduling Information</h5>
                                        </div>
                                        <div className="row">
                                            {selectedDemand.preferred_start_date && (
                                                <div className="col-md-4">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-calendar-date me-2" style={{color: '#22C7EE'}}></i>
                                                            Preferred Start Date
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.preferred_start_date}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold text-muted">
                                                        <i className="bi bi-arrow-repeat me-2" style={{color: '#9c27b0'}}></i>
                                                        Frequency
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
                                                            Duration
                                                        </label>
                                                        <div className="form-control-static p-3 bg-light rounded border">
                                                            {selectedDemand.duration_weeks} weeks
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDemand.preferred_time && (
                                                <div className="col-md-6">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold text-muted">
                                                            <i className="bi bi-clock me-2" style={{color: '#4caf50'}}></i>
                                                            Preferred Time
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
                                                        Contact Method
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
                                                <h5 className="mb-0 text-dark fw-bold">Contact Information</h5>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold text-muted">
                                                    <i className="bi bi-telephone-fill me-2" style={{color: '#f44336'}}></i>
                                                    Emergency Contact
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
                                                    {userData?.user?.role === 'Patient' ? 'Updates from Care Team' : 'Coordinator Notes'}
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
                                                    Add Comment
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
                                                    Under Review
                                                </button>
                                                <button 
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Approved')}
                                                    disabled={selectedDemand.status === 'Approved'}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'In Progress')}
                                                    disabled={selectedDemand.status === 'In Progress'}
                                                >
                                                    In Progress
                                                </button>
                                                <button 
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Completed')}
                                                    disabled={selectedDemand.status === 'Completed'}
                                                >
                                                    Complete
                                                </button>
                                                <button 
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => onStatusUpdate(selectedDemand.id, 'Rejected')}
                                                    disabled={selectedDemand.status === 'Rejected'}
                                                >
                                                    Reject
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
                                            <h5 className="mb-0 text-dark fw-bold">Timeline</h5>
                                        </div>
                                        <div className="timeline">
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="badge bg-primary me-3">Created</span>
                                                <span>{new Date(selectedDemand.created_at).toLocaleString()}</span>
                                            </div>
                                            {selectedDemand.reviewed_at && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-info me-3">Reviewed</span>
                                                    <span>{new Date(selectedDemand.reviewed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.completed_at && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-success me-3">Completed</span>
                                                    <span>{new Date(selectedDemand.completed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.managed_by_info && (
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="badge bg-secondary me-3">Managed by</span>
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
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceDemandMoreInfo;
