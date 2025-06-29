import React, { useState, useEffect, useContext } from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import TicketList from './TicketList';
import TicketDetailModal from './TicketDetailModal';
import TicketFilters from './TicketFilters';
import TicketStats from './TicketStats';
import './TicketDashboard.css';

const ManageTicketsPage = () => {
    const { t } = useCareTranslation();
    const { userData } = useContext(AdminContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

    console.log('[ManageTicketsPage] userData from AdminContext:', userData);
    console.log('[ManageTicketsPage] user role:', userRole);

    useEffect(() => {
        const userRole = userData?.user?.role;
        let initialTeamFilter = '';
        
        // Set team filter based on user role
        if (userRole === 'Coordinator') {
            // Coordinators manage tickets assigned to Administrator team
            initialTeamFilter = 'Administrator';
        } else if (userRole === 'Administrator' || userRole === 'Administrative') {
            // Administrators manage tickets assigned to Coordinator team
            initialTeamFilter = 'Coordinator';
        }
        
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
            <div className="manage-tickets-error">
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
            <div className="manage-tickets-page">
                <div className="manage-tickets-header">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="manage-tickets-title">
                                {t('manageTickets') || 'Manage Tickets'}
                            </h1>
                            <p className="manage-tickets-subtitle">
                                {t('manageTicketsDescription') || 'View and manage support tickets'}
                            </p>
                            {userRole && (
                                <span className={`badge ${getRoleBadgeClass(userRole)}`}>
                                    <i className={`fas ${getRoleIcon(userRole)} me-1`}></i>
                                    {userRole}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <TicketStats stats={stats} />

                <div className="manage-tickets-content">
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
            </div>
            {showDetailModal && selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setShowDetailModal(false)}
                    onTicketUpdate={handleTicketUpdate}
                    readOnly={false}
                    allowStatusUpdate={true}
                />
            )}
        </BaseLayout>
    );
};

export default ManageTicketsPage; 