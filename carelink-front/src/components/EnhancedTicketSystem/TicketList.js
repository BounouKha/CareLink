import React from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const TicketList = ({ tickets, loading, onTicketClick, onStatusUpdate, showActions = true }) => {
    const { common } = useCareTranslation();

    // Test if Font Awesome is loaded
    React.useEffect(() => {
        console.log('Testing Font Awesome icons...');
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-eye';
        document.body.appendChild(testIcon);
        const computedStyle = window.getComputedStyle(testIcon, '::before');
        console.log('Icon computed style:', computedStyle.content);
        document.body.removeChild(testIcon);
    }, []);

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
            case 'Urgent': return 'badge bg-dark';
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
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="ticket-list-loading">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!tickets || tickets.length === 0) {
        return (
            <div className="ticket-list-empty">
                <div className="text-center py-5">
                    <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                    <h4 className="text-muted">{common('noTickets') || 'No tickets found'}</h4>
                    <p className="text-muted">{common('noTicketsDescription') || 'Create a new ticket to get started'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ticket-list">
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>{common('id') || 'ID'}</th>
                            <th>{common('title') || 'Title'}</th>
                            <th>{common('category') || 'Category'}</th>
                            <th>{common('priority') || 'Priority'}</th>
                            <th>{common('status') || 'Status'}</th>
                            <th>{common('assignedTeam') || 'Team'}</th>
                            <th>{common('createdBy') || 'Created By'}</th>
                            <th>{common('createdAt') || 'Created'}</th>
                            {showActions && <th>{common('actions') || 'Actions'}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((ticket) => (
                            <tr key={ticket.id} className="ticket-row">
                                <td>
                                    <span className="fw-bold">#{ticket.id}</span>
                                </td>
                                <td>
                                    <div 
                                        className="ticket-title"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onTicketClick(ticket)}
                                    >
                                        {ticket.title}
                                    </div>
                                    {ticket.description && (
                                        <small className="text-muted d-block">
                                            {ticket.description.length > 50 
                                                ? `${ticket.description.substring(0, 50)}...` 
                                                : ticket.description
                                            }
                                        </small>
                                    )}
                                </td>
                                <td>
                                    <span className="badge bg-light text-dark">
                                        {ticket.category}
                                    </span>
                                </td>
                                <td>
                                    <span className={getPriorityBadgeClass(ticket.priority)}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td>
                                    <span className={getStatusBadgeClass(ticket.status)}>
                                        {ticket.status}
                                    </span>
                                </td>
                                <td>
                                    <span className="badge bg-info">
                                        {ticket.assigned_team}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <small>
                                            {ticket.created_by_name || ticket.created_by}
                                        </small>
                                        {ticket.created_by_role && (
                                            <span className={`ms-1 badge ${getRoleBadgeClass(ticket.created_by_role)}`}>
                                                <i className={`fas ${getRoleIcon(ticket.created_by_role)}`}></i>
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <small className="text-muted">
                                        {formatDate(ticket.created_at)}
                                    </small>
                                </td>
                                {showActions && (
                                    <td>
                                        <div className="btn-group btn-group-sm">
                                            <button 
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => onTicketClick(ticket)}
                                                title={common('viewDetails') || 'View Details'}
                                            >
                                                <i className="fas fa-eye">👁️</i>
                                            </button>
                                            {ticket.status === 'New' && (
                                                <button 
                                                    className="btn btn-outline-success btn-sm"
                                                    onClick={() => onStatusUpdate(ticket.id, 'In Progress')}
                                                    title={common('startWork') || 'Start Work'}
                                                >
                                                    <i className="fas fa-play">▶️</i>
                                                </button>
                                            )}
                                            {ticket.status === 'In Progress' && (
                                                <button 
                                                    className="btn btn-outline-success btn-sm"
                                                    onClick={() => onStatusUpdate(ticket.id, 'Resolved')}
                                                    title={common('markResolved') || 'Mark Resolved'}
                                                >
                                                    <i className="fas fa-check">✅</i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TicketList; 