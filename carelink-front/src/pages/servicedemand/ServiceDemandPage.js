import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import 'bootstrap/dist/css/bootstrap.min.css';
import BaseLayout from '../../auth/layout/BaseLayout';
import ServiceDemandMoreInfo from './ServiceDemandMoreInfo';
import { SpinnerOnly } from '../../components/LoadingComponents';

const ServiceDemandPage = () => {
    const [demands, setDemands] = useState([]);
    const [services, setServices] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [userData, setUserData] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
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
        special_instructions: '',
        selected_patient: '' // Add selected patient for coordinators
    });
    const [patientSearch, setPatientSearch] = useState('');
    const [linkedPatients, setLinkedPatients] = useState([]); // For Family Patients - now array

    useEffect(() => {
        fetchUserData();
        fetchDemands();
        fetchServices();
        fetchStats();
    }, [filterStatus, filterPriority, searchQuery]);

    // Separate useEffect to fetch patients when userData is loaded
    useEffect(() => {
        if (userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') {
            fetchPatients();        } else if (userData?.user?.role === 'Family Patient') {
            fetchLinkedPatients();
        }
    }, [userData?.user?.role]);

    const resetCreateForm = () => {
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
            special_instructions: '',
            selected_patient: ''
        });
        setPatientSearch('');
        setError('');
    };

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
            let url = 'http://localhost:8000/account/service-demands/';            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterPriority) params.append('priority', filterPriority);
            if (searchQuery) params.append('search', searchQuery);
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
    };    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/views_patient/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Ensure we always set an array, even if API returns an object with results
                if (Array.isArray(data)) {
                    setPatients(data);
                } else if (data && Array.isArray(data.results)) {
                    setPatients(data.results);
                } else {
                    console.warn('Unexpected patients data format:', data);
                    setPatients([]);
                }
            } else {
                console.error('Failed to fetch patients:', response.status);
                setPatients([]);
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
            setPatients([]);
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
    };    const handleCreateDemand = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
              // Get patient ID - use selected patient for coordinators, current user for patients, linked patient for family patients
            let patientId = null;
            if (userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') {
                // For coordinators, use the selected patient
                patientId = newDemand.selected_patient;
                if (!patientId) {
                    setError('Please select a patient for this service request');
                    return;
                }            } else if (userData?.user?.role === 'Family Patient') {
                // For family patients, use selected patient ID or auto-selected patient
                if (newDemand.selected_patient) {
                    patientId = newDemand.selected_patient;
                } else if (linkedPatients.length === 1) {
                    // If only one linked patient, use it automatically
                    patientId = linkedPatients[0].id;
                } else if (linkedPatients.length > 1) {
                    setError('Please select which patient this service request is for.');
                    return;
                } else {
                    setError('No linked patients found. Please contact your administrator.');
                    return;
                }
            }else {
                // For patients, use their own patient ID
                if (userData?.patient?.id) {
                    patientId = userData.patient.id;
                } else if (userData?.user?.role === 'Patient') {
                    patientId = userData.user.id;
                }
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
            });            if (response.ok) {
                resetCreateForm();
                fetchDemands();
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
    };    const getStatusColor = (status) => {
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
    
    // Bootstrap status badge class helper
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

    const getPriorityColor = (priority) => {
        const colors = {
            'Low': '#95a5a6',
            'Normal': '#3498db',
            'High': '#f39c12',
            'Urgent': '#e74c3c'
        };
        return colors[priority] || '#7f8c8d';
    };
    
    // Bootstrap priority badge class helper
    const getPriorityBadgeClass = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'low': return 'bg-success text-white';
            case 'normal': return 'bg-info text-white';
            case 'high': return 'bg-warning text-dark';
            case 'urgent': return 'bg-danger text-white';
            default: return 'bg-secondary text-white';
        }
    };const fetchLinkedPatients = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/family-patient/linked-patient/', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[DEBUG] Service Demand - Linked Patients Data:', data);
                
                // Handle both old (linked_patient) and new (linked_patients) API format
                if (data.linked_patients && Array.isArray(data.linked_patients)) {
                    setLinkedPatients(data.linked_patients);
                    // If there's only one patient, auto-select it
                    if (data.linked_patients.length === 1) {
                        setNewDemand(prev => ({
                            ...prev,
                            selected_patient: data.linked_patients[0].id
                        }));
                    }
                } else if (data.linked_patient) {
                    // Fallback for old API format
                    setLinkedPatients([data.linked_patient]);
                    setNewDemand(prev => ({
                        ...prev,
                        selected_patient: data.linked_patient.id
                    }));
                } else {
                    setLinkedPatients([]);
                }
            }
        } catch (error) {
            console.error('Error fetching linked patients:', error);
        }
    };    useEffect(() => {
        // Add scroll event listener to add shadow to header when scrolling
        const handleScroll = () => {
            const header = document.querySelector('.page-header');
            if (header) {
                if (window.scrollY > 10) {
                    header.classList.add('shadow');
                } else {
                    header.classList.remove('shadow');
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) {
        return (        <BaseLayout>
            <div className="service-demand-page">
                <div className="loading-center">
                    <SpinnerOnly size="large" />
                </div>
            </div>
        </BaseLayout>
        );
    }    return (
        <BaseLayout>
            <div className="service-demand-page">
                {/* Fixed Header */}
                <div className="page-header">
                    <h1>Service Demands</h1>                    <button 
                        className="btn btn-primary"
                        style={{ backgroundColor: '#22C7EE', borderColor: '#22C7EE' }}
                        onClick={() => setShowCreateForm(true)}
                    >
                        <i className="bi bi-plus-circle me-1"></i> Request New Service
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="service-demand-container">
                    {error && <div className="error-message">{error}</div>}                    {/* Stats Dashboard (for coordinators/admin) */}
                    {stats && (
                        <div className="stats-dashboard row row-cols-1 row-cols-md-4 g-3 mb-4 bg-light p-3 rounded-3 shadow-sm">
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body bg-white">
                                        <h5 className="card-title">Total Demands</h5>
                                        <p className="card-text fs-1 fw-bold">{stats.total}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body bg-white">
                                        <h5 className="card-title">Pending</h5>
                                        <p className="card-text fs-1 fw-bold text-warning">{stats.pending}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body bg-white">
                                        <h5 className="card-title">In Progress</h5>
                                        <p className="card-text fs-1 fw-bold text-primary">{stats.in_progress}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body bg-white">
                                        <h5 className="card-title">Urgent</h5>
                                        <p className="card-text fs-1 fw-bold text-danger">{stats.urgent}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}                    {/* Filters */}
                    <div className="filters d-flex gap-2 mb-3 bg-light p-3 rounded-3 shadow-sm bg-">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="🔍 Search all fields"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ maxWidth: '300px', borderColor: '#22C7EE', borderRadius: '12px' }}
                        />
                        
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="form-select"
                            style={{ maxWidth: '200px', borderColor: '#22C7EE', borderRadius: '12px' }}
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
                            className="form-select"
                            style={{ maxWidth: '200px', borderColor: '#22C7EE', borderRadius: '12px' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>{/* Service Demands List */}
                    <div className="demands-list">
                        {demands.length === 0 ? (
                            <div className="text-center p-5 bg-light rounded-3 my-4">
                                <p className="fs-5 mb-3">No service demands found.</p>
                                <button 
                                    className="btn btn-primary"
                                    style={{ backgroundColor: '#22C7EE', borderColor: '#22C7EE' }}
                                    onClick={() => setShowCreateForm(true)}
                                >
                                    <i className="bi bi-plus-circle me-1"></i> Create Your First Service Request
                                </button>
                            </div>
                        ) : (
                            demands.map(demand => (
                                <div key={demand.id} className="card mb-3 shadow-sm">
                                    <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-3 pb-1">
                                        <h5 className="card-title mb-0">{demand.title}</h5>
                                        <div className="d-flex">
                                            <span 
                                                className={`badge ${getStatusBadgeClass(demand.status)}`}
                                            >
                                                {demand.status}
                                            </span>
                                            <span 
                                                className={`badge ${getPriorityBadgeClass(demand.priority)} ms-1`}
                                            >
                                                {demand.priority}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card-body pt-2 bg-white">
                                        <div className="row mb-2">
                                            <div className="col-md-6">
                                                <p className="mb-1"><strong>Service:</strong> {demand.service_info?.name || 'N/A'}</p>
                                                {demand.patient_info && (
                                                    <p className="mb-1"><strong>Patient:</strong> {demand.patient_info.firstname} {demand.patient_info.lastname} - {demand.patient_info.birthdate || 'DOB not available'}</p>
                                                )}
                                                <p className="mb-1"><strong>Description:</strong> {demand.description}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <p className="mb-1"><strong>Reason:</strong> {demand.reason}</p>
                                                {demand.preferred_start_date && (
                                                    <p className="mb-1"><strong>Preferred Start Date:</strong> {demand.preferred_start_date}</p>
                                                )}
                                                <p className="mb-1"><strong>Frequency:</strong> {demand.frequency}</p>
                                                <p className="mb-1"><strong>Contact Method:</strong> {demand.contact_method}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                                        <div className="text-muted">
                                            <small className="me-2">Created: {new Date(demand.created_at).toLocaleDateString()}</small>
                                            {demand.days_since_created > 0 && (
                                                <small className="me-2">{demand.days_since_created} days ago</small>
                                            )}
                                            {demand.managed_by_info && (
                                                <small>Managed by: {demand.managed_by_info.firstname} {demand.managed_by_info.lastname}</small>
                                            )}
                                        </div>
                                        {/* Show More Info button for all users to see coordinator notes */}
                                        <div>
                                            <button 
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ borderColor: '#22C7EE', color: '#FFF' }}
                                                onClick={() => handleShowDetails(demand)}
                                            >
                                                More Info
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>                    {/* Create Demand Modal */}
                    {showCreateForm && (
                        <div className="modal-overlay">
                            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                                <div className="modal-content shadow-lg border-0 bg-white" style={{borderRadius: '20px', overflow: 'hidden',}}>
                                        <div className="modal-header bg-gradient text-white border-0 p-4" style={{background: 'linear-gradient(135deg, #22C7EE 0%, #1BA8CA 100%)'}}>
                                            <div className="d-flex align-items-center">
                                                
                                                <div>
                                                    <h4 className="modal-title mb-0 fw-bold text-muted">Request New Service</h4>
                                                    <small className="opacity-90  text-muted">Complete the form below to submit your service request</small>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn-close" 
                                                onClick={resetCreateForm}
                                                aria-label="Close"
                                            >X</button>
                                        </div>
                                        
                                        <div className="modal-body p-4" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                                            <form onSubmit={handleCreateDemand} id="demandForm">                                                {/* Service & Priority Section */}
                                                <div className="row mb-4">
                                                    <div className="col-12">
                                                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #f8f9ff 0%, #ffffff 100%)'}}>
                                                            <div className="card-body p-4 bg-white">
                                                                <div className="d-flex align-items-center mb-3">
                                                                    <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                                                        <i className="bi bi-gear-fill text-primary"></i>
                                                                    </div>
                                                                    <h5 className="mb-0 text-primary fw-bold">Service Details</h5>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-md-8">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-collection me-2" style={{color: '#22C7EE'}}></i>
                                                                                Service Type <span className="text-danger">*</span>
                                                                            </label>
                                                                            <select
                                                                                className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.service}
                                                                                onChange={(e) => setNewDemand({...newDemand, service: e.target.value})}
                                                                                required
                                                                            >
                                                                                <option value="">Choose a service...</option>
                                                                                {services.map(service => (
                                                                                    <option key={service.id} value={service.id}>
                                                                                        {service.name} - €{service.price}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-4">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-exclamation-triangle me-2" style={{color: '#ff9800'}}></i>
                                                                                Priority Level
                                                                            </label>                                                                            <select
                                                                                className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.priority}
                                                                                onChange={(e) => setNewDemand({...newDemand, priority: e.target.value})}
                                                                            >
                                                                                <option value="Low">🟢 Low Priority</option>
                                                                                <option value="Normal">🟡 Normal Priority</option>
                                                                                <option value="High">🟠 High Priority</option>
                                                                                <option value="Urgent">🔴 Urgent</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>                                                {/* Patient Selection for Coordinators */}
                                                {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                                    <div className="row mb-4">
                                                        <div className="col-12">
                                                            <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #fff9e6 0%, #ffffff 100%)'}}>
                                                                <div className="card-body p-4 bg-white">
                                                                    <div className="d-flex align-items-center mb-3">
                                                                        <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                                                                            <i className="bi bi-person-check-fill text-warning"></i>
                                                                        </div>
                                                                        <h5 className="mb-0 text-warning fw-bold">Patient Selection</h5>
                                                                    </div>                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="bi bi-search me-2" style={{color: '#22C7EE'}}></i>
                                                                            Search Patients
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-lg border-2 shadow-sm mb-3 bg-light"
                                                                            style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                            placeholder="🔍 Search by name or birthdate..."
                                                                            value={patientSearch}
                                                                            onChange={(e) => setPatientSearch(e.target.value)}
                                                                        />
                                                                    </div>                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="bi bi-person-fill me-2" style={{color: '#22C7EE'}}></i>
                                                                            Select Patient <span className="text-danger">*</span>
                                                                        </label>
                                                                        <select
                                                                            className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                            style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                            value={newDemand.selected_patient}
                                                                            onChange={(e) => setNewDemand({...newDemand, selected_patient: e.target.value})}
                                                                            required
                                                                        >
                                                                            <option value="">Choose a patient...</option>
                                                                            {Array.isArray(patients) && patients
                                                                                .filter(patient => {
                                                                                    if (!patientSearch) return true;
                                                                                    const searchLower = patientSearch.toLowerCase();
                                                                                    return (
                                                                                        patient.lastname?.toLowerCase().includes(searchLower) ||
                                                                                        patient.firstname?.toLowerCase().includes(searchLower) ||
                                                                                        patient.birth_date?.includes(searchLower)
                                                                                    );
                                                                                })
                                                                                .map(patient => (
                                                                                    <option key={patient.id} value={patient.id}>
                                                                                        {patient.lastname}, {patient.firstname} - {patient.birth_date}
                                                                                    </option>
                                                                                ))
                                                                            }
                                                                        </select>
                                                                        {patientSearch && (
                                                                            <div className="mt-2">
                                                                                <small className="text-info">
                                                                                    <i className="bi bi-info-circle me-1"></i>
                                                                                    {Array.isArray(patients) ? patients.filter(patient => {
                                                                                        const searchLower = patientSearch.toLowerCase();
                                                                                        return (
                                                                                            patient.lastname?.toLowerCase().includes(searchLower) ||
                                                                                            patient.firstname?.toLowerCase().includes(searchLower) ||
                                                                                            patient.birth_date?.includes(searchLower)
                                                                                        );
                                                                                    }).length : 0} patients found
                                                                                </small>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}                                                {/* Patient Selection/Information for Family Patients */}
                                                {userData?.user?.role === 'Family Patient' && linkedPatients && linkedPatients.length > 0 && (
                                                    <div className="row mb-4">
                                                        <div className="col-12">
                                                            <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #e8f5e8 0%, #ffffff 100%)'}}>
                                                                <div className="card-body p-4">
                                                                    <div className="d-flex align-items-center mb-3">
                                                                        <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                                                                            <i className="bi bi-people-fill text-success"></i>
                                                                        </div>
                                                                        <h5 className="mb-0 text-success fw-bold">Linked Patient Information</h5>
                                                                    </div>
                                                                    {linkedPatients.length === 1 ? (
                                                                        <div className="alert alert-info border-0 shadow-sm" style={{borderRadius: '12px'}}>
                                                                            <div className="d-flex align-items-center">
                                                                                <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                                                                                    <i className="bi bi-person-heart text-info fs-5"></i>
                                                                                </div>
                                                                                <div>
                                                                                    <h6 className="mb-1 fw-bold">{linkedPatients[0].firstname} {linkedPatients[0].lastname}</h6>
                                                                                    <p className="mb-1 text-muted">Born: {linkedPatients[0].birth_date}</p>
                                                                                    <span className="badge bg-info text-white">
                                                                                        {linkedPatients[0].relationship || 'Family Member'}
                                                                                    </span>
                                                                                    <small className="d-block mt-2 text-secondary">
                                                                                        <i className="bi bi-info-circle me-1"></i>
                                                                                        This service request will be created for your linked patient
                                                                                    </small>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (                                                                        <div>
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-person-fill me-2" style={{color: '#22C7EE'}}></i>
                                                                                Select Patient <span className="text-danger">*</span>
                                                                            </label>
                                                                            <select
                                                                                className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.selected_patient}
                                                                                onChange={(e) => setNewDemand({...newDemand, selected_patient: e.target.value})}
                                                                                required
                                                                            >
                                                                                <option value="">Select which patient this request is for...</option>
                                                                                {linkedPatients.map((patient, index) => (
                                                                                    <option key={index} value={patient.id}>
                                                                                        {patient.firstname} {patient.lastname} ({patient.relationship || 'Family Member'}) - Born: {patient.birth_date}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            <small className="form-text text-muted mt-2">
                                                                                <i className="bi bi-info-circle me-1"></i>
                                                                                You have {linkedPatients.length} linked patients. Please select who this service request is for.
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}                                                {/* Basic Information Section */}
                                                <div className="row mb-4">
                                                    <div className="col-12">
                                                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #f0f8ff 0%, #ffffff 100%)'}}>
                                                            <div className="card-body p-4 bg-white">
                                                                <div className="d-flex align-items-center mb-3">
                                                                    <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                                                                        <i className="bi bi-clipboard-data-fill text-info"></i>
                                                                    </div>
                                                                    <h5 className="mb-0 text-info fw-bold">Service Request Details</h5>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-12">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-card-heading me-2" style={{color: '#22C7EE'}}></i>
                                                                                Request Title <span className="text-danger">*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.title}
                                                                                onChange={(e) => setNewDemand({...newDemand, title: e.target.value})}
                                                                                placeholder="💬 Brief title for your service request..."
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-file-text me-2" style={{color: '#22C7EE'}}></i>
                                                                                Description <span className="text-danger">*</span>
                                                                            </label>
                                                                            <textarea
                                                                                className="form-control border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                rows="4"
                                                                                value={newDemand.description}
                                                                                onChange={(e) => setNewDemand({...newDemand, description: e.target.value})}
                                                                                placeholder="📝 Detailed description of the service needed..."
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-heart-pulse me-2" style={{color: '#e91e63'}}></i>
                                                                                Medical Reason <span className="text-danger">*</span>
                                                                            </label>
                                                                            <textarea
                                                                                className="form-control border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                rows="4"
                                                                                value={newDemand.reason}
                                                                                onChange={(e) => setNewDemand({...newDemand, reason: e.target.value})}
                                                                                placeholder="🏥 Medical reason or justification for this service..."
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>                                                {/* Scheduling Section */}
                                                <div className="row mb-4">
                                                    <div className="col-12">
                                                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #fff5f5 0%, #ffffff 100%)'}}>
                                                            <div className=" bg-white">
                                                                <div className="d-flex align-items-center mb-3">
                                                                    <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                                                                        <i className="bi bi-calendar-event-fill text-danger"></i>
                                                                    </div>
                                                                    <h5 className="mb-0 text-danger fw-bold">Scheduling Information</h5>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-md-4">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-calendar-date me-2" style={{color: '#22C7EE'}}></i>
                                                                                Preferred Start Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                className="form-control form-control-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.preferred_start_date}
                                                                                onChange={(e) => setNewDemand({...newDemand, preferred_start_date: e.target.value})}
                                                                                min={new Date().toISOString().split('T')[0]}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-4">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-arrow-repeat me-2" style={{color: '#9c27b0'}}></i>
                                                                                Frequency
                                                                            </label>
                                                                            <select
                                                                                className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.frequency}
                                                                                onChange={(e) => setNewDemand({...newDemand, frequency: e.target.value})}
                                                                            >
                                                                                <option value="Once">🔄 One-time service</option>
                                                                                <option value="Daily">📅 Daily</option>
                                                                                <option value="Weekly">📅 Weekly</option>
                                                                                <option value="Bi-weekly">📅 Bi-weekly</option>
                                                                                <option value="Monthly">📅 Monthly</option>
                                                                                <option value="As needed">📅 As needed</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-4">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-hourglass-split me-2" style={{color: '#ff9800'}}></i>
                                                                                Duration (weeks)
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.duration_weeks}
                                                                                onChange={(e) => setNewDemand({...newDemand, duration_weeks: e.target.value})}
                                                                                placeholder="Number of weeks"
                                                                                min="1"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-clock me-2" style={{color: '#4caf50'}}></i>
                                                                                Preferred Time
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.preferred_time}
                                                                                onChange={(e) => setNewDemand({...newDemand, preferred_time: e.target.value})}
                                                                                placeholder="🕐 e.g., Morning, Afternoon, Evening..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-telephone me-2" style={{color: '#2196f3'}}></i>
                                                                                Contact Method
                                                                            </label>
                                                                            <select
                                                                                className="form-select form-select-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.contact_method}
                                                                                onChange={(e) => setNewDemand({...newDemand, contact_method: e.target.value})}
                                                                            >
                                                                                <option value="Email">📧 Email</option>
                                                                                <option value="Phone">📞 Phone Call</option>
                                                                                <option value="Video Call">📹 Video Call</option>
                                                                                <option value="In Person">👥 In Person</option>
                                                                                <option value="SMS">💬 SMS</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>                                                {/* Additional Information Section */}
                                                <div className="row mb-4">
                                                    <div className="col-12">
                                                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(145deg, #f5f0ff 0%, #ffffff 100%)'}}>
                                                            <div className="card-body p-4 bg-white">
                                                                <div className="d-flex align-items-center mb-3">
                                                                    <div className="bg-secondary bg-opacity-10 rounded-circle p-2 me-3">
                                                                        <i className="bi bi-info-circle-fill text-secondary"></i>
                                                                    </div>
                                                                    <h5 className="mb-0 text-secondary fw-bold">Additional Information</h5>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-telephone-fill me-2" style={{color: '#f44336'}}></i>
                                                                                Emergency Contact
                                                                            </label>
                                                                            <input
                                                                                type="tel"
                                                                                className="form-control form-control-lg border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                value={newDemand.emergency_contact}
                                                                                onChange={(e) => setNewDemand({...newDemand, emergency_contact: e.target.value})}
                                                                                placeholder="📱 Emergency contact number..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">                                                                        <div className="mb-3">
                                                                            <label className="form-label fw-semibold text-muted">
                                                                                <i className="bi bi-chat-dots me-2" style={{color: '#22C7EE'}}></i>
                                                                                Special Instructions
                                                                            </label>
                                                                            <textarea
                                                                                className="form-control border-2 shadow-sm bg-light"
                                                                                style={{borderColor: '#e3f2fd', borderRadius: '12px'}}
                                                                                rows="3"
                                                                                value={newDemand.special_instructions}
                                                                                onChange={(e) => setNewDemand({...newDemand, special_instructions: e.target.value})}
                                                                                placeholder="📋 Any special instructions or requirements..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                        
                                        <div className="modal-footer border-0 p-4 bg-white" style={{borderRadius: '1 1 20px 20px', backgroundColor: '#2d3748'}}>
                                            <div className="d-flex w-100 gap-3">
                                                <button 
                                                    type="button" 
                                                    className="btn btn-light btn-lg border-2 flex-fill"
                                                    style={{borderRadius: '12px', borderColor: '#dee2e6'}}
                                                    onClick={resetCreateForm}
                                                >
                                                    <i className="bi bi-x-circle me-2"></i>
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    form="demandForm"
                                                    className="btn btn-lg flex-fill text-white fw-bold"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #22C7EE 0%, #1BA8CA 100%)',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 4px 15px rgba(34, 199, 238, 0.3)'
                                                    }}
                                                >
                                                    <i className="bi bi-send-fill me-2"></i>
                                                    Submit Service Request                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        </div>
                    )}                    {/* Service Demand Detail Modal */}
                    {showDetailModal && selectedDemand && (
                        <ServiceDemandMoreInfo
                            selectedDemand={selectedDemand}
                            userData={userData}
                            onClose={() => setShowDetailModal(false)}
                            onStatusUpdate={handleStatusUpdate}
                            onAddComment={handleAddComment}
                            newComment={newComment}
                            setNewComment={setNewComment}
                        />
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ServiceDemandPage;
