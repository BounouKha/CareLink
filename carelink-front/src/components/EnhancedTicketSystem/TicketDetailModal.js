import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import { AdminContext } from '../../auth/login/AdminContext';
import './TicketDetailModal.css';

const TicketDetailModal = ({ ticket, onClose, onTicketUpdate, readOnly = false, allowStatusUpdate = false }) => {
    const { t, common } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState('');
    const [statusNotes, setStatusNotes] = useState('');
    const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

    const userRole = userData?.user?.role;

    useEffect(() => {
        if (ticket) {
            fetchComments();
        }
    }, [ticket]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`http://localhost:8000/account/ticket-comments/by_ticket/?ticket_id=${ticket.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setComments(data.results || data);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('http://localhost:8000/account/ticket-comments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ticket: ticket.id,
                    comment: newComment,
                    is_internal: false
                }),
            });

            if (response.ok) {
                // Clear the comment field
                setNewComment('');
                
                // Show success feedback
                console.log('Comment added successfully');
                
                // Refresh comments
                fetchComments();
                
                // Call the update callback to refresh parent component
                if (onTicketUpdate) {
                    onTicketUpdate();
                }
            } else {
                console.error('Failed to add comment:', response.status, response.statusText);
            }
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!statusUpdate) return;

        try {
            setSubmitting(true);
            setStatusUpdateSuccess(false);
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`http://localhost:8000/account/enhanced-tickets/${ticket.id}/update_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: statusUpdate,
                    notes: statusNotes || `Status updated to ${statusUpdate}`
                }),
            });

            if (response.ok) {
                // Clear form fields
                setStatusUpdate('');
                setStatusNotes('');
                
                // Show success feedback
                console.log('Status updated successfully to:', statusUpdate);
                setStatusUpdateSuccess(true);
                
                // Call the update callback to refresh parent component
                if (onTicketUpdate) {
                    onTicketUpdate();
                }
                
                // Close the modal after successful update
                setTimeout(() => {
                    onClose();
                }, 1000); // Longer delay to show success state
            } else {
                console.error('Failed to update status:', response.status, response.statusText);
            }
        } catch (err) {
            console.error('Error updating status:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'New': return 'badge bg-primary';
            case 'In Progress': return 'badge bg-warning';
            case 'Resolved': return 'badge bg-success';
            case 'Cancelled': return 'badge bg-secondary';
            default: return 'badge bg-light text-dark';
        }
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'Low': return 'badge bg-info';
            case 'Medium': return 'badge bg-warning';
            case 'High': return 'badge bg-danger';
            case 'Urgent': return 'badge bg-danger';
            default: return 'badge bg-light text-dark';
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Coordinator': return 'badge bg-success';
            case 'Administrator': 
            case 'Administrative': return 'badge bg-danger';
            default: return 'badge bg-light text-dark';
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Coordinator': return 'fa-user-tie';
            case 'Administrator': 
            case 'Administrative': return 'fa-user-shield';
            default: return 'fa-user';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (!ticket) return null;

    return (
        <div className="ticket-modal-overlay" onClick={onClose}>
            <div className="ticket-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="ticket-modal-content">
                    <div className="ticket-modal-header">
                        <h5 className="modal-title">
                            <i className="fas fa-ticket-alt me-2"></i>
                            {common('ticketDetails') || 'Ticket Details'}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                        ></button>
                    </div>
                    
                    <div className="ticket-modal-body">
                        <div className="row ticket-modal-row">
                            {/* Ticket Information */}
                            <div className="col-md-8 ticket-modal-col-md-8">
                                <div className="card ticket-detail-card mb-3">
                                    <div className="card-header">
                                        <h6 className="mb-0">
                                            <i className="fas fa-info-circle me-2"></i>
                                            {common('ticketInfo') || 'Ticket Information'}
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-8">
                                                <h4 className="mb-3">{ticket.title}</h4>
                                                <p className="text-muted mb-3">{ticket.description}</p>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="d-flex flex-column gap-2">
                                                    <span className={`badge ticket-detail-badge ${getStatusBadgeClass(ticket.status)}`}>
                                                        {ticket.status}
                                                    </span>
                                                    <span className={`badge ticket-detail-badge ${getPriorityBadgeClass(ticket.priority)}`}>
                                                        {ticket.priority}
                                                    </span>
                                                    <span className="badge ticket-detail-badge bg-info">
                                                        {ticket.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <hr />
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <small className="text-muted">{common('assignedTeam') || 'Assigned Team'}</small>
                                                <p className="mb-2">
                                                    <span className={`badge ticket-detail-badge ${getRoleBadgeClass(ticket.assigned_team)}`}>
                                                        <i className={`fas ${getRoleIcon(ticket.assigned_team)} me-1`}></i>
                                                        {ticket.assigned_team} Team
                                                    </span>
                                                </p>
                                                
                                                <small className="text-muted">{common('assignedTo') || 'Assigned To'}</small>
                                                <p className="mb-2">
                                                    {ticket.assigned_to_name || common('unassigned') || 'Unassigned'}
                                                </p>
                                            </div>
                                            <div className="col-md-6">
                                                <small className="text-muted">{common('createdBy') || 'Created By'}</small>
                                                <p className="mb-2">
                                                    {ticket.created_by_name}
                                                    {ticket.created_by_role && (
                                                        <span className={`ms-1 badge ticket-detail-badge ${getRoleBadgeClass(ticket.created_by_role)}`}>
                                                            <i className={`fas ${getRoleIcon(ticket.created_by_role)} me-1`}></i>
                                                            {ticket.created_by_role}
                                                        </span>
                                                    )}
                                                </p>
                                                
                                                <small className="text-muted">{common('createdAt') || 'Created At'}</small>
                                                <p className="mb-2">{formatDate(ticket.created_at)}</p>
                                            </div>
                                        </div>
                                        
                                        {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                                            <div className="mt-2">
                                                <small className="text-muted">{common('updatedAt') || 'Updated At'}</small>
                                                <p className="mb-0">{formatDate(ticket.updated_at)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div className="card ticket-detail-card">
                                    <div className="card-header">
                                        <h6 className="mb-0">
                                            <i className="fas fa-comments me-2"></i>
                                            {common('comments') || 'Comments'} ({comments.length})
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        {loading ? (
                                            <div className="text-center py-3">
                                                <div className="spinner-border ticket-detail-spinner-border-sm" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <p className="text-muted text-center py-3 ticket-detail-text-muted text-center">
                                                {common('noComments') || 'No comments yet.'}
                                            </p>
                                        ) : (
                                            <div className="ticket-comments-list">
                                                {comments.map((comment) => (
                                                    <div key={comment.id} className="ticket-comment-item mb-3">
                                                        <div className="d-flex align-items-start">
                                                            <div className="ticket-comment-avatar me-3">
                                                                <i className="fas fa-user-circle fa-2x text-muted"></i>
                                                            </div>
                                                            <div className="ticket-comment-content flex-grow-1">
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <strong>{comment.created_by_name}</strong>
                                                                    <small className="text-muted">
                                                                        {formatDate(comment.created_at)}
                                                                    </small>
                                                                </div>
                                                                <p className="mb-0">{comment.comment}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {!readOnly && (
                                            <div className="mt-3">
                                                <div className="form-group">
                                                    <textarea
                                                        className="form-control ticket-detail-form-control"
                                                        rows="3"
                                                        placeholder={common('addCommentPlaceholder') || 'Add a comment...'}
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        disabled={submitting}
                                                    ></textarea>
                                                </div>
                                                <div className="mt-2">
                                                    <button
                                                        className="ticket-modal-btn ticket-modal-btn-primary btn-sm"
                                                        onClick={handleAddComment}
                                                        disabled={!newComment.trim() || submitting}
                                                    >
                                                        {submitting ? (
                                                            <>
                                                                <span className="spinner-border ticket-detail-spinner-border-sm me-2" role="status"></span>
                                                                {common('adding') || 'Adding...'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-plus me-2"></i>
                                                                {common('addComment') || 'Add Comment'}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Sidebar */}
                            <div className="col-md-4 ticket-modal-col-md-4">
                                {allowStatusUpdate && (
                                    <div className="card ticket-detail-card mb-3">
                                        <div className="card-header">
                                            <h6 className="mb-0">
                                                <i className="fas fa-cogs me-2"></i>
                                                {common('actions') || 'Actions'}
                                            </h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="mb-3">
                                                <label className="ticket-detail-form-label">{common('updateStatus') || 'Update Status'}</label>
                                                <select
                                                    className="form-select ticket-detail-form-select mb-2"
                                                    value={statusUpdate}
                                                    onChange={(e) => setStatusUpdate(e.target.value)}
                                                    disabled={submitting}
                                                >
                                                    <option value="">{common('selectStatus') || 'Select Status'}</option>
                                                    <option value="New">New</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Resolved">Resolved</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                                
                                                <textarea
                                                    className="form-control ticket-detail-form-control mb-2"
                                                    rows="2"
                                                    placeholder={common('statusNotesPlaceholder') || 'Add notes (optional)'}
                                                    value={statusNotes}
                                                    onChange={(e) => setStatusNotes(e.target.value)}
                                                    disabled={submitting}
                                                ></textarea>
                                                
                                                <button
                                                    className={`ticket-modal-btn btn-sm w-100 ${
                                                        statusUpdateSuccess 
                                                            ? 'ticket-modal-btn-success' 
                                                            : 'ticket-modal-btn-warning'
                                                    }`}
                                                    onClick={handleStatusUpdate}
                                                    disabled={!statusUpdate || submitting}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <span className="spinner-border ticket-detail-spinner-border-sm me-2" role="status"></span>
                                                            {common('updating') || 'Updating...'}
                                                        </>
                                                    ) : statusUpdateSuccess ? (
                                                        <>
                                                            <i className="fas fa-check me-2"></i>
                                                            Status Updated!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-save me-2"></i>
                                                            {common('updateStatus') || 'Update Status'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Info */}
                                <div className="card ticket-detail-card">
                                    <div className="card-header">
                                        <h6 className="mb-0">
                                            <i className="fas fa-info me-2"></i>
                                            {common('quickInfo') || 'Quick Info'}
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <small className="text-muted">{common('ticketId') || 'Ticket ID'}</small>
                                            <p className="mb-0">#{ticket.id}</p>
                                        </div>
                                        
                                        <div className="mb-2">
                                            <small className="text-muted">{common('daysSinceCreated') || 'Days Since Created'}</small>
                                            <p className="mb-0">{ticket.days_since_created || 0} days</p>
                                        </div>
                                        
                                        {ticket.is_overdue && (
                                            <div className="mb-2">
                                                <span className="badge ticket-detail-badge bg-danger">
                                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                                    {common('overdue') || 'Overdue'}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {ticket.is_urgent && (
                                            <div className="mb-2">
                                                <span className="badge ticket-detail-badge bg-danger">
                                                    <i className="fas fa-fire me-1"></i>
                                                    {common('urgent') || 'Urgent'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="ticket-modal-footer">
                        <button 
                            type="button" 
                            className="ticket-modal-btn ticket-modal-btn-secondary" 
                            onClick={onClose}
                        >
                            {common('close') || 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailModal;