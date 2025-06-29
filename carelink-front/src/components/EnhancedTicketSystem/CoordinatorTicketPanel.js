import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import TicketList from './TicketList';
import TicketDetailModal from './TicketDetailModal';
import TicketFilters from './TicketFilters';
import TicketStats from './TicketStats';
import './TicketDashboard.css';

const CoordinatorTicketPanel = () => {
    const { t, common } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        assigned_team: 'Coordinator', // Fixed to Coordinator team only
        category: '',
        my_tickets: false,
        is_overdue: false,
        search: ''
    });
    const [stats, setStats] = useState({});
    const [categories, setCategories] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [teams, setTeams] = useState([]);

    // Get user role from userData
    const userRole = userData?.user?.role;

    console.log('[CoordinatorTicketPanel] userData from AdminContext:', userData);
    console.log('[CoordinatorTicketPanel] user role:', userRole);

    useEffect(() => {
        fetchTickets();
        fetchStats();
        fetchOptions();
    }, [filters]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            console.log('[CoordinatorTicketPanel] Token from localStorage:', token ? 'Token exists' : 'No token');
            
            if (!token) {
                throw new Error('No access token found');
            }

            // Build query parameters - ALWAYS include Coordinator team filter
            const params = new URLSearchParams();
            
            // Always add Coordinator team filter (cannot be cleared)
            params.append('assigned_team', 'Coordinator');
            
            // Add other filters only if they have values
            Object.keys(filters).forEach(key => {
                if (key !== 'assigned_team' && filters[key] && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            const url = `http://localhost:8000/account/enhanced-tickets/?${params}`;
            console.log('[CoordinatorTicketPanel] Fetching tickets from:', url);
            console.log('[CoordinatorTicketPanel] Filters:', filters);
            console.log('[CoordinatorTicketPanel] Headers:', {
                'Authorization': `Bearer ${token ? 'Token exists' : 'No token'}`,
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('[CoordinatorTicketPanel] Response status:', response.status);
            console.log('[CoordinatorTicketPanel] Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[CoordinatorTicketPanel] Response error text:', errorText);
                throw new Error(`Failed to fetch tickets: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('[CoordinatorTicketPanel] Tickets data:', data);
            setTickets(data.results || data);
        } catch (err) {
            console.error('[CoordinatorTicketPanel] Error fetching tickets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            // Fetch stats for Coordinator team tickets only
            const response = await fetch('http://localhost:8000/account/enhanced-tickets/dashboard_stats/?assigned_team=Coordinator', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[CoordinatorTicketPanel] Stats data (Coordinator team only):', data);
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
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
                setTeams(teamsData);
            }
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleTicketUpdate = () => {
        fetchTickets();
        fetchStats();
    };

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const handleStatusUpdate = async (ticketId, newStatus) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            const response = await fetch(`http://localhost:8000/account/enhanced-tickets/${ticketId}/update_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: newStatus,
                    notes: `Status updated to ${newStatus}`
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update ticket status');
            }

            // Refresh tickets and stats
            fetchTickets();
            fetchStats();
        } catch (err) {
            console.error('Error updating ticket status:', err);
            setError(err.message);
        }
    };

    const handleAddComment = async (ticketId) => {
        // Refresh tickets to update comment count
        fetchTickets();
        fetchStats();
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

    if (error) {
        return (
            <div className="coordinator-tickets-error">
                <div className="alert alert-danger">
                    <h4>Error</h4>
                    <p>{error}</p>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            setError(null);
                            fetchTickets();
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BaseLayout>
            <div className="coordinator-ticket-page">
                <div className="coordinator-ticket-header">
                    <h1 className="coordinator-ticket-title">
                        {t('manageCoordinatorTickets') || 'Manage Coordinator Tickets'}
                    </h1>
                    <p className="coordinator-ticket-subtitle">
                        {t('manageCoordinatorTicketsDescription') || 'Handle tickets assigned to Coordinator team'}
                    </p>
                    {userRole && (
                        <span className={`badge ${getRoleBadgeClass(userRole)}`}>
                            <i className={`fas ${getRoleIcon(userRole)} me-2`}></i>
                            {userRole}
                        </span>
                    )}
                </div>

                <div className="coordinator-ticket-content">
                    <div className="row">
                        <div className="col-12">
                            {/* Stats Section */}
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h5 className="card-title text-primary">{stats.total_tickets || 0}</h5>
                                            <p className="card-text">{t('totalTickets') || 'Total Tickets'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h5 className="card-title text-warning">{stats.new_tickets || 0}</h5>
                                            <p className="card-text">{t('newTickets') || 'New Tickets'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h5 className="card-title text-info">{stats.in_progress || 0}</h5>
                                            <p className="card-text">{t('inProgress') || 'In Progress'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h5 className="card-title text-success">{stats.resolved || 0}</h5>
                                            <p className="card-text">{common('resolved') || 'Resolved'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters Section */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">
                                        <i className="fas fa-filter me-2"></i>
                                        {t('filters') || 'Filters'}
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <TicketFilters
                                        filters={filters}
                                        onFilterChange={handleFilterChange}
                                        categories={categories}
                                        priorities={priorities}
                                        teams={teams}
                                        userData={userData}
                                    />
                                </div>
                            </div>

                            {/* Tickets List */}
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
                                        {t('noCoordinatorTickets') || 'No Coordinator tickets found'}
                                    </h4>
                                    <p className="text-muted">
                                        {t('noCoordinatorTicketsDescription') || 'There are no tickets assigned to the Coordinator team at the moment.'}
                                    </p>
                                </div>
                            ) : (
                                <TicketList 
                                    tickets={tickets}
                                    onTicketClick={handleTicketClick}
                                    onStatusUpdate={handleStatusUpdate}
                                    showActions={true}
                                />
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
                        readOnly={false}
                        allowStatusUpdate={true}
                    />
                )}
            </div>
        </BaseLayout>
    );
};

export default CoordinatorTicketPanel; 