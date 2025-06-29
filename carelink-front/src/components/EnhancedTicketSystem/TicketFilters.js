import React from 'react';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const TicketFilters = ({ filters, onFilterChange, categories, priorities, teams, userData }) => {
    const { common } = useCareTranslation();
    
    // Get user role from props
    const getUserRole = () => {
        return userData?.user?.role || '';
    };
    
    const userRole = getUserRole();
    
    // Filter teams based on user role
    const getFilteredTeams = () => {
        if (userRole === 'Coordinator') {
            // Coordinators can ONLY see Administrator team tickets
            return teams.filter(team => team.value === 'Administrator');
        } else if (userRole === 'Administrator' || userRole === 'Administrative') {
            // Administrators can ONLY see Coordinator team tickets
            return teams.filter(team => team.value === 'Coordinator');
        } else {
            // Regular users can see both Administrator and Coordinator teams
            return teams.filter(team => team.value === 'Administrator' || team.value === 'Coordinator');
        }
    };
    
    const filteredTeams = getFilteredTeams();

    const handleFilterChange = (field, value) => {
        onFilterChange({ [field]: value });
    };

    const clearFilters = () => {
        const clearedFilters = {
            status: '',
            priority: '',
            category: '',
            my_tickets: false,
            is_overdue: false,
            search: ''
        };
        
        // For coordinators, keep the assigned_team as 'Coordinator'
        if (userRole === 'Coordinator') {
            clearedFilters.assigned_team = 'Coordinator';
        } else {
            clearedFilters.assigned_team = '';
        }
        
        onFilterChange(clearedFilters);
    };

    const hasActiveFilters = () => {
        const activeFilters = filters.status || filters.category || filters.priority || 
                             filters.my_tickets || filters.is_overdue || filters.search;
        
        // For coordinators, don't consider assigned_team as an active filter since it's always 'Coordinator'
        if (userRole !== 'Coordinator') {
            return activeFilters || filters.assigned_team;
        }
        
        return activeFilters;
    };

    return (
        <div className="ticket-filters">
            <div className="row g-3">
                <div className="col-md-6">
                    <label className="form-label">Search</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search tickets..."
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>
                
                <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                        className="form-select"
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <select
                        className="form-select"
                        value={filters.category || ''}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="col-md-6">
                    <label className="form-label">Priority</label>
                    <select
                        className="form-select"
                        value={filters.priority || ''}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                    >
                        <option value="">All Priorities</option>
                        {priorities.map(pri => (
                            <option key={pri.value} value={pri.value}>
                                {pri.label}
                            </option>
                        ))}
                    </select>
                </div>
                
                {/* Show team filter for regular users, hide for coordinators since it's always Coordinator */}
                {userRole !== 'Coordinator' && (
                    <div className="col-md-6">
                        <label className="form-label">Team</label>
                        <select
                            className="form-select"
                            value={filters.assigned_team || ''}
                            onChange={(e) => handleFilterChange('assigned_team', e.target.value)}
                        >
                            <option value="">All Teams</option>
                            {filteredTeams.map(team => (
                                <option key={team.value} value={team.value}>
                                    {team.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="col-md-6">
                    <label className="form-label">&nbsp;</label>
                    <div className="d-flex gap-2">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="myTickets"
                                checked={filters.my_tickets || false}
                                onChange={(e) => handleFilterChange('my_tickets', e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="myTickets">
                                My Tickets Only
                            </label>
                        </div>
                        
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="overdue"
                                checked={filters.is_overdue || false}
                                onChange={(e) => handleFilterChange('is_overdue', e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="overdue">
                                Overdue Only
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            {hasActiveFilters() && (
                <div className="mt-3">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={clearFilters}
                    >
                        Clear All Filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default TicketFilters; 