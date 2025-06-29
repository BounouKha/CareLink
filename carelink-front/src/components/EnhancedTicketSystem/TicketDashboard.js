import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import TicketList from './TicketList';
import TicketCreateModal from './TicketCreateModal';
import TicketDetailModal from './TicketDetailModal';
import TicketFilters from './TicketFilters';
import TicketStats from './TicketStats';
import './TicketDashboard.css';

const TicketDashboard = () => {
    const { t } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        assigned_team: '',
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

    console.log('[TicketDashboard] userData from AdminContext:', userData);
    console.log('[TicketDashboard] user role:', userRole);

    useEffect(() => {
        const userRole = userData?.user?.role;
        let initialTeamFilter = '';
        
        // Set team filter based on user role
        if (userRole === 'Coordinator') {
            // Coordinators view tickets assigned to Administrator team
            initialTeamFilter = 'Administrator';
        } else if (userRole === 'Administrator' || userRole === 'Administrative') {
            // Administrators view tickets assigned to Coordinator team
            initialTeamFilter = 'Coordinator';
        }
        // Regular users don't get a default team filter - they can see both teams
        
        if (initialTeamFilter) {
            setFilters(prev => ({ ...prev, assigned_team: initialTeamFilter }));
        }
    }, [userData]);

    useEffect(() => {
        fetchTickets();
        fetchStats();
        fetchOptions();
    }, [filters]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Build query parameters
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            const response = await fetch(`http://localhost:8000/account/enhanced-tickets/?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tickets');
            }

            const data = await response.json();
            setTickets(data.results || data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('http://localhost:8000/account/enhanced-tickets/dashboard_stats/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
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
                console.log('[TicketDashboard] Teams fetched from API:', teamsData);
                console.log('[TicketDashboard] Teams length:', teamsData?.length);
                console.log('[TicketDashboard] Teams structure:', teamsData?.map(t => ({ value: t.value, label: t.label })));
                setTeams(teamsData);
            } else {
                console.error('[TicketDashboard] Failed to fetch teams:', teamsRes.status, teamsRes.statusText);
            }
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    const handleCreateTicket = async (ticketData) => {
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
                body: JSON.stringify(ticketData),
            });

            if (!response.ok) {
                throw new Error('Failed to create ticket');
            }

            const newTicket = await response.json();
            setTickets(prev => [newTicket, ...prev]);
            setShowCreateModal(false);
            fetchStats(); // Refresh stats
        } catch (err) {
            console.error('Error creating ticket:', err);
            setError(err.message);
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

    if (error) {
        return (
            <div className="ticket-dashboard-error">
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
            <div className="ticket-dashboard">
                <div className="ticket-dashboard-header">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1 className="ticket-dashboard-title">
                            {t('title') || 'Enhanced Ticket System'}
                        </h1>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <i className="fas fa-plus me-2"></i>
                            {t('createTicket') || 'Create Ticket'}
                        </button>
                    </div>
                    
                    <div className="mb-4">
                        <TicketStats stats={stats} />
                    </div>
                </div>

                <div className="ticket-dashboard-content">
                    {/* Filters Section - Top */}
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

                    {/* Tickets List - Full Width */}
                    <div className="row">
                        <div className="col-12">
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
                                        {t('noTickets') || 'No tickets found'}
                                    </h4>
                                    <p className="text-muted">
                                        {t('noTicketsDescription') || 'There are no tickets matching your current filters.'}
                                    </p>
                                </div>
                            ) : (
                                <TicketList 
                                    tickets={tickets}
                                    loading={loading}
                                    onTicketClick={handleTicketClick}
                                    onStatusUpdate={handleStatusUpdate}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {showCreateModal && (
                    <>
                        {console.log('[TicketDashboard] About to render TicketCreateModal with teams:', teams)}
                        {console.log('[TicketDashboard] About to render TicketCreateModal with userData:', userData)}
                        <TicketCreateModal
                            isOpen={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            onSubmit={handleCreateTicket}
                            categories={categories}
                            priorities={priorities}
                            teams={teams}
                            userData={userData}
                        />
                    </>
                )}

                {showDetailModal && (
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

export default TicketDashboard; 