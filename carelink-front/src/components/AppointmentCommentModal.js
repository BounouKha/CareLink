import React, { useState, useEffect } from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
import tokenManager from '../utils/tokenManager';
import './AppointmentCommentModal.css';

const AppointmentCommentModal = ({ 
    isOpen, 
    onClose, 
    timeslotId, 
    appointmentDate, 
    patientName, 
    providerName 
}) => {
    const [comment, setComment] = useState('');
    const [existingComment, setExistingComment] = useState(null);
    const [allComments, setAllComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [canComment, setCanComment] = useState(false);
    const [permissionInfo, setPermissionInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const { common, schedule } = useCareTranslation();

    useEffect(() => {
        if (isOpen && timeslotId) {
            console.log('[APPOINTMENT COMMENT MODAL] Opening modal for timeslot:', timeslotId);
            checkPermission();
            loadExistingComment();
        }
    }, [isOpen, timeslotId]);

    // Debug logging for state changes
    useEffect(() => {
        console.log('[APPOINTMENT COMMENT MODAL] State update:', {
            canComment,
            existingComment: !!existingComment,
            isEditing,
            loading,
            error: !!error,
            permissionInfo
        });
    }, [canComment, existingComment, isEditing, loading, error, permissionInfo]);

    const checkPermission = async () => {
        try {
            console.log(`[APPOINTMENT COMMENT] Checking permission for timeslot ${timeslotId}`);
            
            const response = await fetch(`http://localhost:8000/account/appointment-comments/${timeslotId}/check-permission/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`[APPOINTMENT COMMENT] Permission check result:`, data);
            
            setPermissionInfo(data);
            setCanComment(data.can_comment);
            
            if (!data.can_comment) {
                setError(data.reason || 'You cannot comment on this appointment.');
            }
        } catch (error) {
            console.error('[APPOINTMENT COMMENT] Permission check error:', error);
            setError('Error checking permissions. Please try again.');
            setCanComment(false);
        }
    };

    const loadExistingComment = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/account/appointment-comments/${timeslotId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[APPOINTMENT COMMENT] Loaded comments:', data);
                
                if (data.comments && data.comments.length > 0) {
                    // Handle array response - since backend filters by current user, all comments are theirs
                    setAllComments(data.comments);
                    
                    // Take the first comment as the user's comment (there should only be one per user)
                    const userComment = data.comments[0];
                    setExistingComment(userComment);
                    setComment(userComment.comment);
                } else if (data.comment) {
                    // Handle single comment response
                    setAllComments([data.comment]);
                    setExistingComment(data.comment);
                    setComment(data.comment.comment);
                } else {
                    // No comments found - reset state
                    setAllComments([]);
                    setExistingComment(null);
                    setComment('');
                }
            }
            // Don't set error if comment doesn't exist - that's normal
        } catch (error) {
            console.error('[APPOINTMENT COMMENT] Load comment error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!comment.trim()) {
            setError('Please enter a comment');
            return;
        }

        if (comment.length > 500) {
            setError('Comment must be 500 characters or less');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const method = existingComment ? 'PUT' : 'POST';
            const url = `http://localhost:8000/account/appointment-comments/${timeslotId}/`;
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment: comment.trim() }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Console log as requested
                console.log(`[APPOINTMENT COMMENT] Comment ${existingComment ? 'updated' : 'added'}:`, {
                    timeslotId,
                    commentId: data.comment.id,
                    commentPreview: comment.substring(0, 50) + (comment.length > 50 ? '...' : '')
                });
                
                // Update existing comment state
                if (existingComment) {
                    setExistingComment({
                        ...existingComment,
                        comment: comment,
                        is_edited: true,
                        updated_at: data.comment.updated_at
                    });
                } else {
                    setExistingComment(data.comment);
                }
                
                setIsEditing(false);
                
                // Show success message
                const message = data.message || (existingComment ? 'Comment updated successfully!' : 'Comment added successfully!');
                alert(message);
                
                // Refresh the comment data to make sure everything is up to date
                await loadExistingComment();
                
                // Don't close the modal immediately - let user see the comment
                // The user can close it manually if they want
                
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to save comment');
            }
        } catch (err) {
            setError('Network error occurred');
            console.error('[APPOINTMENT COMMENT] Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!existingComment || !window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`http://localhost:8000/account/appointment-comments/${timeslotId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Console log as requested
                console.log('[APPOINTMENT COMMENT] Comment deleted:', {
                    timeslotId,
                    commentId: existingComment.id
                });
                
                setExistingComment(null);
                setComment('');
                setIsEditing(false);
                onClose();
                
                alert('Comment deleted successfully!');
                
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to delete comment');
            }
        } catch (err) {
            setError('Network error occurred');
            console.error('[APPOINTMENT COMMENT] Delete error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setComment(existingComment.comment);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setComment(existingComment ? existingComment.comment : '');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="appointment-comment-modal-overlay">
            <div className="appointment-comment-modal">
                <div className="modal-header">
                    <h3>Appointment Comment</h3>
                    <button 
                        className="close-button" 
                        onClick={onClose}
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="appointment-info">
                        <h3>💬 Appointment Comment</h3>
                        <div className="appointment-details">
                            <p><strong>Patient:</strong> {patientName}</p>
                            <p><strong>Date:</strong> {appointmentDate}</p>
                            {permissionInfo && (
                                <div className="permission-info">
                                    {permissionInfo.has_happened ? (
                                        <p className="appointment-status past">
                                            ✅ Appointment completed {permissionInfo.days_since_appointment} day(s) ago
                                            {permissionInfo.within_14_day_window ? 
                                                ` - You can still add comments (within 14 days)` : 
                                                ` - Comment period has expired (14 day limit)`
                                            }
                                        </p>
                                    ) : (
                                        <p className="appointment-status future">
                                            📅 This appointment hasn't happened yet. Comments can only be added after the appointment.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : !canComment ? (
                        <div className="no-permission">
                            <p>You cannot comment on this appointment.</p>
                            {permissionInfo && <p>Reason: {permissionInfo.reason}</p>}
                        </div>
                    ) : (
                        <div className="comment-section">
                            {/* Debug: Show all comments if there are multiple */}
                            {allComments.length > 1 && (
                                <div className="all-comments-section">
                                    <h4>All Comments on this Appointment:</h4>
                                    {allComments.map((comment, index) => (
                                        <div key={comment.id || index} className="existing-comment">
                                            <h5>{comment.created_by_name || 'Unknown User'} {comment.is_current_user ? '(You)' : ''}</h5>
                                            <div className="comment-text">
                                                {comment.comment}
                                            </div>
                                            <div className="comment-meta">
                                                <small>
                                                    {comment.is_edited ? 'Updated' : 'Created'}: {' '}
                                                    {new Date(comment.is_edited ? comment.updated_at : comment.created_at).toLocaleString()}
                                                    {comment.is_edited && <span className="edited-badge"> (edited)</span>}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* User's own comment section */}
                            {existingComment && !isEditing ? (
                                <div className="existing-comment">
                                    <h4>Your Comment:</h4>
                                    <div className="comment-text">
                                        {existingComment.comment}
                                    </div>
                                    <div className="comment-meta">
                                        <small>
                                            {existingComment.is_edited ? 'Updated' : 'Created'}: {' '}
                                            {new Date(existingComment.is_edited ? existingComment.updated_at : existingComment.created_at).toLocaleString()}
                                            {existingComment.is_edited && <span className="edited-badge"> (edited)</span>}
                                        </small>
                                    </div>
                                    <div className="comment-actions">
                                        <button 
                                            type="button" 
                                            onClick={handleEdit}
                                            className="btn btn-secondary"
                                        >
                                            Edit Comment
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleDelete}
                                            className="btn btn-danger"
                                        >
                                            Delete Comment
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="comment">
                                            {existingComment ? 'Edit your comment:' : 'Add your comment:'}
                                        </label>
                                        <textarea
                                            id="comment"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Enter your comment about this appointment..."
                                            maxLength={500}
                                            rows={4}
                                            required
                                        />
                                        <small className="char-count">
                                            {comment.length}/500 characters
                                        </small>
                                    </div>
                                    
                                    <div className="form-actions">
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Saving...' : (existingComment ? 'Update Comment' : 'Add Comment')}
                                        </button>
                                        {isEditing && (
                                            <button 
                                                type="button" 
                                                onClick={handleCancel}
                                                className="btn btn-secondary"
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentCommentModal; 