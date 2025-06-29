import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import TicketList from './TicketList';
import TicketDetailModal from './TicketDetailModal';
import TicketCreateModal from './TicketCreateModal';
import './TicketDashboard.css';

const CoordinatorHelpdeskPanel = () => {
    const { t } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [success, setSuccess] = useState(false);
    const [categories, setCategories] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [teams, setTeams] = useState([]);

    // Get user role from userData
    const userRole = userData?.user?.role;

    console.log('[CoordinatorHelpdeskPanel] userData from AdminContext:', userData);
    console.log('[CoordinatorHelpdeskPanel] user role:', userRole);

    useEffect(() => {
        fetchSubmittedTickets();
        fetchOptions();
    }, []);

    const fetchSubmittedTickets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Fetch tickets created by the current user (my_tickets=true)
            const url = `http://localhost:8000/account/enhanced-tickets/?my_tickets=true&assigned_team=Administrator`;
            console.log('[CoordinatorHelpdeskPanel] Fetching submitted tickets from:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch tickets: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('[CoordinatorHelpdeskPanel] Submitted tickets data:', data);
            setTickets(data.results || data);
        } catch (err) {
            console.error('[CoordinatorHelpdeskPanel] Error fetching submitted tickets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const [categoriesRes, prioritiesRes, teamsRes] = await Promise.all([
                fetch('http://localhost:8000/account/enhanced-tickets/categories/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch('http://localhost:8000/account/enhanced-tickets/priorities/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch('http://localhost:8000/account/enhanced-tickets/teams/', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
            ]);

            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setCategories(categoriesData);
            }

            if (prioritiesRes.ok) {
                const prioritiesData = await prioritiesRes.json();
                setPriorities(prioritiesData);
            }

            if (teamsRes.ok) {
                const teamsData = await teamsRes.json();
                console.log('[CoordinatorHelpdeskPanel] Teams fetched from API:', teamsData);
                console.log('[CoordinatorHelpdeskPanel] Teams length:', teamsData?.length);
                console.log('[CoordinatorHelpdeskPanel] Teams structure:', teamsData?.map(t => ({ value: t.value, label: t.label })));
                setTeams(teamsData);
            } else {
                console.error('[CoordinatorHelpdeskPanel] Failed to fetch teams:', teamsRes.status, teamsRes.statusText);
            }
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const handleNewTicketClick = () => {
        setShowCreateModal(true);
    };

    const handleTicketCreated = () => {
        setShowCreateModal(false);
        setSuccess(true);
        fetchSubmittedTickets(); // Refresh the list
        setTimeout(() => setSuccess(false), 3000);
    };

    const handleTicketUpdate = () => {
        fetchSubmittedTickets();
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

    return (
        <BaseLayout>
            <div className="coordinator-helpdesk-page">
                <div className="coordinator-helpdesk-header">
                    <h1 className="coordinator-helpdesk-title">
                        {t('helpdeskTickets') || 'Helpdesk Tickets'}
                    </h1>
                    <p className="coordinator-helpdesk-subtitle">
                        {t('helpdeskTicketsDescription') || 'View your submitted support requests to the Administrator team'}
                    </p>
                    {userRole && (
                        <span className={`badge ${getRoleBadgeClass(userRole)}`}>
                            <i className={`fas ${getRoleIcon(userRole)} me-2`}></i>
                            {userRole}
                        </span>
                    )}
                </div>

                {success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2"></i>
                        {t('helpdeskTicketSubmittedSuccess') || 'Helpdesk ticket submitted successfully!'}
                    </div>
                )}

                <div className="coordinator-helpdesk-content">
                    <div className="row">
                        <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="mb-0">
                                    {t('mySubmittedTickets') || 'My Submitted Tickets'}
                                </h2>
                                {tickets.length > 0 && (
                                    <button 
                                        className="btn btn-primary"
                                        onClick={handleNewTicketClick}
                                    >
                                        <i className="fas fa-plus me-2"></i>
                                        {t('newHelpdeskTicket') || 'New Helpdesk Ticket'}
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="alert alert-danger">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    {error}
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-4">
                                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                                    <h4 className="text-muted">
                                        {t('noSubmittedTickets') || 'No submitted tickets yet'}
                                    </h4>
                                    <p className="text-muted">
                                        {t('noSubmittedTicketsDescription') || 'You haven\'t submitted any helpdesk tickets yet.'}
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={handleNewTicketClick}
                                    >
                                        <i className="fas fa-plus me-2"></i>
                                        {t('submitFirstTicket') || 'Submit Your First Ticket'}
                                    </button>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>{t('id') || 'ID'}</th>
                                                <th>{t('title') || 'Title'}</th>
                                                <th>{t('category') || 'Category'}</th>
                                                <th>{t('priority') || 'Priority'}</th>
                                                <th>{t('status') || 'Status'}</th>
                                                <th>{t('assignedTeam') || 'Team'}</th>
                                                <th>{t('createdAt') || 'Created'}</th>
                                                <th>{t('view') || 'View'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map((ticket) => (
                                                <tr key={ticket.id} className="ticket-row">
                                                    <td>
                                                        <span className="fw-bold">#{ticket.id}</span>
                                                    </td>
                                                    <td>
                                                        <div className="ticket-title">
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
                                                        <span className={`badge ${
                                                            ticket.priority === 'Low' ? 'bg-info' :
                                                            ticket.priority === 'Medium' ? 'bg-warning' :
                                                            ticket.priority === 'High' ? 'bg-danger' :
                                                            'bg-dark'
                                                        }`}>
                                                            {ticket.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${
                                                            ticket.status === 'New' ? 'bg-primary' :
                                                            ticket.status === 'In Progress' ? 'bg-warning' :
                                                            ticket.status === 'Resolved' ? 'bg-success' :
                                                            'bg-secondary'
                                                        }`}>
                                                            {ticket.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-info">
                                                            {ticket.assigned_team}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {new Date(ticket.created_at).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => handleTicketClick(ticket)}
                                                            title={t('viewDetails') || 'View Details'}
                                                        >
                                                            <i className="fas fa-eye me-1"></i>
                                                            {t('view') || 'View'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ticket Detail Modal */}
                {showDetailModal && selectedTicket && (
                    <TicketDetailModal
                        ticket={selectedTicket}
                        onClose={() => setShowDetailModal(false)}
                        onTicketUpdate={handleTicketUpdate}
                        readOnly={userRole !== 'Coordinator'} // Allow coordinators to add comments
                        allowStatusUpdate={false} // No status updates in helpdesk view
                    />
                )}

                {/* Ticket Create Modal */}
                {showCreateModal && (
                    <>
                        {console.log('[CoordinatorHelpdeskPanel] About to render TicketCreateModal with teams:', teams)}
                        {console.log('[CoordinatorHelpdeskPanel] About to render TicketCreateModal with userData:', userData)}
                        <TicketCreateModal
                            isOpen={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            onSubmit={async (formData) => {
                                try {
                                    const token = localStorage.getItem('accessToken');
                                    if (!token) {
                                        throw new Error('No access token found');
                                    }

                                    const response = await fetch('http://localhost:8000/account/enhanced-tickets/', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                        },
                                        body: JSON.stringify(formData),
                                    });

                                    if (!response.ok) {
                                        throw new Error('Failed to create ticket');
                                    }

                                    const newTicket = await response.json();
                                    console.log('Helpdesk ticket created successfully:', newTicket);
                                    handleTicketCreated();
                                } catch (error) {
                                    console.error('Error creating helpdesk ticket:', error);
                                    throw error;
                                }
                            }}
                            categories={categories}
                            priorities={priorities}
                            teams={teams}
                            userData={userData}
                        />
                    </>
                )}
            </div>
        </BaseLayout>
    );
};

export default CoordinatorHelpdeskPanel; 