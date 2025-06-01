import React, { useState, useEffect } from 'react';
import './ServiceDemandPage.css';
import BaseLayout from '../../auth/layout/BaseLayout';
import LeftToolbar from '../../auth/layout/LeftToolbar';

const ServiceDemandPage = () => {
    const [demands, setDemands] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [userData, setUserData] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');    const [filterPriority, setFilterPriority] = useState('');
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDemand, setSelectedDemand] = useState(null);
    const [newComment, setNewComment] = useState('');

    const [newDemand, setNewDemand] = useState({
        service: '',
        title: '',
        description: '',
        reason: '',
        priority: 'Normal',
        preferred_start_date: '',
        frequency: 'Once',
        duration_weeks: '',
        preferred_time: '',
        contact_method: 'Email',
        emergency_contact: '',
        special_instructions: ''
    });

    useEffect(() => {
        fetchUserData();
        fetchDemands();
        fetchServices();
        fetchStats();
    }, [filterStatus, filterPriority]);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/profile/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserData(data);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const fetchDemands = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            let url = 'http://localhost:8000/account/service-demands/';
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterPriority) params.append('priority', filterPriority);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setDemands(data.results);
            } else {
                setError('Failed to fetch service demands');
            }
        } catch (error) {
            setError('Error fetching service demands');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/services/', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setServices(data);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/service-demands/stats/', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            // Stats might not be available for all user types
            console.log('Stats not available');
        }
    };

    const handleCreateDemand = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            
            // Get patient ID for current user
            let patientId = null;
            if (userData?.patient?.id) {
                patientId = userData.patient.id;
            } else if (userData?.user?.role === 'Patient') {
                // Try to find patient by user ID
                // This might need adjustment based on your data structure
                patientId = userData.user.id;
            }

            const demandData = {
                ...newDemand,
                patient: patientId,
                preferred_start_date: newDemand.preferred_start_date || null,
                duration_weeks: newDemand.duration_weeks ? parseInt(newDemand.duration_weeks) : null
            };

            const response = await fetch('http://localhost:8000/account/service-demands/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(demandData)
            });

            if (response.ok) {
                setShowCreateForm(false);
                setNewDemand({
                    service: '',
                    title: '',
                    description: '',
                    reason: '',
                    priority: 'Normal',
                    preferred_start_date: '',
                    frequency: 'Once',
                    duration_weeks: '',
                    preferred_time: '',
                    contact_method: 'Email',
                    emergency_contact: '',
                    special_instructions: ''
                });
                fetchDemands();
                setError('');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to create service demand');
            }
        } catch (error) {
            setError('Error creating service demand');
            console.error('Error:', error);
        }
    };

    const handleShowDetails = (demand) => {
        setSelectedDemand(demand);
        setShowDetailModal(true);
        setNewComment('');
    };

    const handleStatusUpdate = async (demandId, newStatus, comment = '') => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:8000/account/service-demands/${demandId}/status/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    coordinator_notes: comment
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update the selected demand with new data
                setSelectedDemand(data.demand);
                // Refresh the demands list
                fetchDemands();
                setError('');
                alert(data.message);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update status');
            }
        } catch (error) {
            setError('Error updating status');
            console.error('Error:', error);
        }
    };

    const handleAddComment = async (demandId, comment) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:8000/account/service-demands/${demandId}/comment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ comment })
            });

            if (response.ok) {
                const data = await response.json();
                // Update the selected demand with new coordinator notes
                setSelectedDemand(prev => ({
                    ...prev,
                    coordinator_notes: data.coordinator_notes
                }));
                setNewComment('');
                setError('');
                alert(data.message);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add comment');
            }
        } catch (error) {
            setError('Error adding comment');
            console.error('Error:', error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': '#f39c12',
            'Under Review': '#3498db',
            'Approved': '#27ae60',
            'In Progress': '#9b59b6',
            'Completed': '#2ecc71',
            'Rejected': '#e74c3c',
            'Cancelled': '#95a5a6'
        };
        return colors[status] || '#7f8c8d';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'Low': '#95a5a6',
            'Normal': '#3498db',
            'High': '#f39c12',
            'Urgent': '#e74c3c'
        };
        return colors[priority] || '#7f8c8d';
    };

    if (loading) {
        return (
            <BaseLayout>
                <LeftToolbar userData={userData} />
                <div className="service-demand-page">
                    <div className="loading">Loading service demands...</div>
                </div>
            </BaseLayout>
        );
    }

    return (
        <BaseLayout>
            <LeftToolbar userData={userData} />
            <div className="service-demand-page">
                <div className="service-demand-container">
                    <div className="page-header">
                        <h1>Service Demands</h1>
                        <button 
                            className="create-demand-btn"
                            onClick={() => setShowCreateForm(true)}
                        >
                            + Request New Service
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {/* Stats Dashboard (for coordinators/admin) */}
                    {stats && (
                        <div className="stats-dashboard">
                            <div className="stat-card">
                                <h3>Total Demands</h3>
                                <span className="stat-number">{stats.total}</span>
                            </div>
                            <div className="stat-card">
                                <h3>Pending</h3>
                                <span className="stat-number">{stats.pending}</span>
                            </div>
                            <div className="stat-card">
                                <h3>In Progress</h3>
                                <span className="stat-number">{stats.in_progress}</span>
                            </div>
                            <div className="stat-card urgent">
                                <h3>Urgent</h3>
                                <span className="stat-number">{stats.urgent}</span>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="filters">
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Approved">Approved</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>

                        <select 
                            value={filterPriority} 
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Priorities</option>
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>

                    {/* Service Demands List */}
                    <div className="demands-list">
                        {demands.length === 0 ? (
                            <div className="no-demands">
                                <p>No service demands found.</p>
                                <button 
                                    className="create-first-demand-btn"
                                    onClick={() => setShowCreateForm(true)}
                                >
                                    Create Your First Service Request
                                </button>
                            </div>
                        ) : (
                            demands.map(demand => (
                                <div key={demand.id} className="demand-card">
                                    <div className="demand-header">
                                        <h3>{demand.title}</h3>
                                        <div className="demand-badges">
                                            <span 
                                                className="status-badge" 
                                                style={{ backgroundColor: getStatusColor(demand.status) }}
                                            >
                                                {demand.status}
                                            </span>
                                            <span 
                                                className="priority-badge" 
                                                style={{ backgroundColor: getPriorityColor(demand.priority) }}
                                            >
                                                {demand.priority}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="demand-content">
                                        <p><strong>Service:</strong> {demand.service_info?.name || 'N/A'}</p>
                                        <p><strong>Description:</strong> {demand.description}</p>
                                        <p><strong>Reason:</strong> {demand.reason}</p>
                                        {demand.preferred_start_date && (
                                            <p><strong>Preferred Start Date:</strong> {demand.preferred_start_date}</p>
                                        )}
                                        <p><strong>Frequency:</strong> {demand.frequency}</p>
                                        <p><strong>Contact Method:</strong> {demand.contact_method}</p>
                                    </div>
                                      <div className="demand-footer">
                                        <div className="demand-meta">
                                            <small>Created: {new Date(demand.created_at).toLocaleDateString()}</small>
                                            {demand.days_since_created > 0 && (
                                                <small>{demand.days_since_created} days ago</small>
                                            )}
                                            {demand.managed_by && (
                                                <small>Managed by: {demand.managed_by.firstname} {demand.managed_by.lastname}</small>
                                            )}
                                        </div>
                                        {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                            <div className="demand-actions">
                                                <button 
                                                    className="details-btn"
                                                    onClick={() => handleShowDetails(demand)}
                                                >
                                                    More Info
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Create Demand Modal */}
                    {showCreateForm && (
                        <div className="modal-overlay">
                            <div className="create-demand-modal">
                                <div className="modal-header">
                                    <h2>Request New Service</h2>
                                    <button 
                                        className="close-modal"
                                        onClick={() => setShowCreateForm(false)}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <form onSubmit={handleCreateDemand} className="demand-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Service *</label>
                                            <select
                                                value={newDemand.service}
                                                onChange={(e) => setNewDemand({...newDemand, service: e.target.value})}
                                                required
                                            >
                                                <option value="">Select a service</option>
                                                {services.map(service => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.name} - €{service.price}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Priority</label>
                                            <select
                                                value={newDemand.priority}
                                                onChange={(e) => setNewDemand({...newDemand, priority: e.target.value})}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Normal">Normal</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Title *</label>
                                        <input
                                            type="text"
                                            value={newDemand.title}
                                            onChange={(e) => setNewDemand({...newDemand, title: e.target.value})}
                                            placeholder="Brief title for your service request"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Description *</label>
                                        <textarea
                                            value={newDemand.description}
                                            onChange={(e) => setNewDemand({...newDemand, description: e.target.value})}
                                            placeholder="Detailed description of the service needed"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Medical Reason *</label>
                                        <textarea
                                            value={newDemand.reason}
                                            onChange={(e) => setNewDemand({...newDemand, reason: e.target.value})}
                                            placeholder="Medical reason or justification for this service"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Preferred Start Date</label>
                                            <input
                                                type="date"
                                                value={newDemand.preferred_start_date}
                                                onChange={(e) => setNewDemand({...newDemand, preferred_start_date: e.target.value})}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Frequency</label>
                                            <select
                                                value={newDemand.frequency}
                                                onChange={(e) => setNewDemand({...newDemand, frequency: e.target.value})}
                                            >
                                                <option value="Once">One-time service</option>
                                                <option value="Daily">Daily</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Bi-weekly">Bi-weekly</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="As needed">As needed</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Duration (weeks)</label>
                                            <input
                                                type="number"
                                                value={newDemand.duration_weeks}
                                                onChange={(e) => setNewDemand({...newDemand, duration_weeks: e.target.value})}
                                                placeholder="How many weeks?"
                                                min="1"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Preferred Time</label>
                                            <input
                                                type="text"
                                                value={newDemand.preferred_time}
                                                onChange={(e) => setNewDemand({...newDemand, preferred_time: e.target.value})}
                                                placeholder="e.g., Morning, Afternoon, Evening"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Contact Method</label>
                                            <select
                                                value={newDemand.contact_method}
                                                onChange={(e) => setNewDemand({...newDemand, contact_method: e.target.value})}
                                            >
                                                <option value="Email">Email</option>
                                                <option value="Phone">Phone Call</option>
                                                <option value="Video Call">Video Call</option>
                                                <option value="In Person">In Person</option>
                                                <option value="SMS">SMS</option>
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Emergency Contact</label>
                                            <input
                                                type="tel"
                                                value={newDemand.emergency_contact}
                                                onChange={(e) => setNewDemand({...newDemand, emergency_contact: e.target.value})}
                                                placeholder="Emergency contact number"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Special Instructions</label>
                                        <textarea
                                            value={newDemand.special_instructions}
                                            onChange={(e) => setNewDemand({...newDemand, special_instructions: e.target.value})}
                                            placeholder="Any special instructions or requirements"
                                        />
                                    </div>

                                    <div className="form-actions">
                                        <button type="button" onClick={() => setShowCreateForm(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit">
                                            Submit Request
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Demand Details Modal */}
                    {showDetailModal && selectedDemand && (
                        <div className="modal-overlay">
                            <div className="demand-details-modal">
                                <div className="modal-header">
                                    <h2>Demand Details</h2>
                                    <button 
                                        className="close-modal"
                                        onClick={() => setShowDetailModal(false)}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="modal-content">
                                    <h3>{selectedDemand.title}</h3>
                                    
                                    <div className="demand-info">
                                        <p><strong>Service:</strong> {selectedDemand.service_info?.name || 'N/A'}</p>
                                        <p><strong>Description:</strong> {selectedDemand.description}</p>
                                        <p><strong>Reason:</strong> {selectedDemand.reason}</p>
                                        {selectedDemand.preferred_start_date && (
                                            <p><strong>Preferred Start Date:</strong> {selectedDemand.preferred_start_date}</p>
                                        )}
                                        <p><strong>Frequency:</strong> {selectedDemand.frequency}</p>
                                        <p><strong>Contact Method:</strong> {selectedDemand.contact_method}</p>
                                    </div>
                                    
                                    <div className="demand-status">
                                        <h4>Status: 
                                            <span 
                                                className="status-label" 
                                                style={{ backgroundColor: getStatusColor(selectedDemand.status) }}
                                            >
                                                {selectedDemand.status}
                                            </span>
                                        </h4>
                                    </div>

                                    {/* Coordinator notes and comments */}
                                    {selectedDemand.coordinator_notes && (
                                        <div className="coordinator-notes">
                                            <h4>Coordinator Notes:</h4>
                                            <p>{selectedDemand.coordinator_notes}</p>
                                        </div>
                                    )}

                                    <div className="comment-section">
                                        <h4>Comments:</h4>
                                        <div className="comments-list">
                                            {selectedDemand.comments && selectedDemand.comments.length > 0 ? (
                                                selectedDemand.comments.map((comment, index) => (
                                                    <div key={index} className="comment-item">
                                                        <p>{comment}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p>No comments yet.</p>
                                            )}
                                        </div>

                                        <div className="add-comment">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                            />
                                            <button 
                                                onClick={() => handleAddComment(selectedDemand.id, newComment)}
                                                disabled={!newComment}
                                            >
                                                Add Comment
                                            </button>
                                        </div>
                                    </div>

                                    {/* Status update section (for coordinators/admin) */}
                                    {userData?.user?.role !== 'Patient' && (
                                        <div className="status-update-section">
                                            <h4>Update Status:</h4>
                                            <select
                                                value={selectedDemand.status}
                                                onChange={(e) => handleStatusUpdate(selectedDemand.id, e.target.value)}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Under Review">Under Review</option>
                                                <option value="Approved">Approved</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Rejected">Rejected</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    )}
                                </div>                            </div>
                        </div>
                    )}

                    {/* Coordinator Detail Modal */}
                    {showDetailModal && selectedDemand && (
                        <div className="modal-overlay">
                            <div className="detail-modal">
                                <div className="modal-header">
                                    <h2>Service Demand Details</h2>
                                    <button 
                                        className="close-modal"
                                        onClick={() => setShowDetailModal(false)}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="detail-content">
                                    <div className="detail-section">
                                        <h3>Basic Information</h3>
                                        <div className="detail-row">
                                            <span className="detail-label">Title:</span>
                                            <span>{selectedDemand.title}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Service:</span>
                                            <span>{selectedDemand.service_info?.name || 'N/A'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Patient:</span>
                                            <span>{selectedDemand.patient_info?.firstname} {selectedDemand.patient_info?.lastname}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Priority:</span>
                                            <span 
                                                className="priority-badge" 
                                                style={{ backgroundColor: getPriorityColor(selectedDemand.priority) }}
                                            >
                                                {selectedDemand.priority}
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Current Status:</span>
                                            <span 
                                                className="status-badge" 
                                                style={{ backgroundColor: getStatusColor(selectedDemand.status) }}
                                            >
                                                {selectedDemand.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="detail-section">
                                        <h3>Description & Requirements</h3>
                                        <div className="detail-row">
                                            <span className="detail-label">Description:</span>
                                            <span>{selectedDemand.description}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Medical Reason:</span>
                                            <span>{selectedDemand.reason}</span>
                                        </div>
                                        {selectedDemand.special_instructions && (
                                            <div className="detail-row">
                                                <span className="detail-label">Special Instructions:</span>
                                                <span>{selectedDemand.special_instructions}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-section">
                                        <h3>Scheduling Information</h3>
                                        {selectedDemand.preferred_start_date && (
                                            <div className="detail-row">
                                                <span className="detail-label">Preferred Start Date:</span>
                                                <span>{selectedDemand.preferred_start_date}</span>
                                            </div>
                                        )}
                                        <div className="detail-row">
                                            <span className="detail-label">Frequency:</span>
                                            <span>{selectedDemand.frequency}</span>
                                        </div>
                                        {selectedDemand.duration_weeks && (
                                            <div className="detail-row">
                                                <span className="detail-label">Duration:</span>
                                                <span>{selectedDemand.duration_weeks} weeks</span>
                                            </div>
                                        )}
                                        {selectedDemand.preferred_time && (
                                            <div className="detail-row">
                                                <span className="detail-label">Preferred Time:</span>
                                                <span>{selectedDemand.preferred_time}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-section">
                                        <h3>Contact Information</h3>
                                        <div className="detail-row">
                                            <span className="detail-label">Contact Method:</span>
                                            <span>{selectedDemand.contact_method}</span>
                                        </div>
                                        {selectedDemand.emergency_contact && (
                                            <div className="detail-row">
                                                <span className="detail-label">Emergency Contact:</span>
                                                <span>{selectedDemand.emergency_contact}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Management Section (Coordinator Only) */}
                                    {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                        <div className="detail-section coordinator-section">
                                            <h3>Status Management</h3>
                                            <div className="status-actions">
                                                <label>Change Status:</label>
                                                <div className="status-buttons">
                                                    <button 
                                                        className="status-btn under-review"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Under Review')}
                                                        disabled={selectedDemand.status === 'Under Review'}
                                                    >
                                                        Under Review
                                                    </button>
                                                    <button 
                                                        className="status-btn approved"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Approved')}
                                                        disabled={selectedDemand.status === 'Approved'}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        className="status-btn in-progress"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'In Progress')}
                                                        disabled={selectedDemand.status === 'In Progress'}
                                                    >
                                                        In Progress
                                                    </button>
                                                    <button 
                                                        className="status-btn completed"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Completed')}
                                                        disabled={selectedDemand.status === 'Completed'}
                                                    >
                                                        Complete
                                                    </button>
                                                    <button 
                                                        className="status-btn rejected"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Rejected')}
                                                        disabled={selectedDemand.status === 'Rejected'}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Coordinator Notes Section */}
                                    {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                        <div className="detail-section coordinator-section">
                                            <h3>Coordinator Notes</h3>
                                            {selectedDemand.coordinator_notes ? (
                                                <div className="notes-display">
                                                    {selectedDemand.coordinator_notes.split('\n\n').map((note, index) => (
                                                        <div key={index} className="note-entry">
                                                            {note}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="no-notes">No coordinator notes yet.</p>
                                            )}
                                            
                                            <div className="add-comment">
                                                <label>Add Comment:</label>
                                                <textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Add a comment or note about this demand..."
                                                    rows="3"
                                                />
                                                <button 
                                                    className="add-comment-btn"
                                                    onClick={() => {
                                                        if (newComment.trim()) {
                                                            handleAddComment(selectedDemand.id, newComment.trim());
                                                        }
                                                    }}
                                                    disabled={!newComment.trim()}
                                                >
                                                    Add Comment
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="detail-section">
                                        <h3>Timeline</h3>
                                        <div className="timeline">
                                            <div className="timeline-item">
                                                <span className="timeline-date">Created:</span>
                                                <span>{new Date(selectedDemand.created_at).toLocaleString()}</span>
                                            </div>
                                            {selectedDemand.reviewed_at && (
                                                <div className="timeline-item">
                                                    <span className="timeline-date">Reviewed:</span>
                                                    <span>{new Date(selectedDemand.reviewed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.completed_at && (
                                                <div className="timeline-item">
                                                    <span className="timeline-date">Completed:</span>
                                                    <span>{new Date(selectedDemand.completed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDemand.managed_by && (
                                                <div className="timeline-item">
                                                    <span className="timeline-date">Managed by:</span>
                                                    <span>{selectedDemand.managed_by.firstname} {selectedDemand.managed_by.lastname}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button 
                                        className="close-btn"
                                        onClick={() => setShowDetailModal(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ServiceDemandPage;
