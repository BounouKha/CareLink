import React, { useState, useEffect } from 'react';
import './ServiceDemandPage-new.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import BaseLayout from '../../auth/layout/BaseLayout';

const ServiceDemandPage = () => {
    const [demands, setDemands] = useState([]);
    const [services, setServices] = useState([]);
    const [patients, setPatients] = useState([]);
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
        special_instructions: '',
        selected_patient: '' // Add selected patient for coordinators
    });    const [patientSearch, setPatientSearch] = useState('');
    const [linkedPatients, setLinkedPatients] = useState([]); // For Family Patients - now array

    useEffect(() => {
        fetchUserData();
        fetchDemands();
        fetchServices();
        fetchStats();
    }, [filterStatus, filterPriority]);

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
        return (
            <BaseLayout>
                <div className="service-demand-page">
                    <div className="loading">Loading service demands...</div>
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
                        <div className="stats-dashboard row row-cols-1 row-cols-md-4 g-3 mb-4">
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <h5 className="card-title">Total Demands</h5>
                                        <p className="card-text fs-1 fw-bold">{stats.total}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <h5 className="card-title">Pending</h5>
                                        <p className="card-text fs-1 fw-bold text-warning">{stats.pending}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <h5 className="card-title">In Progress</h5>
                                        <p className="card-text fs-1 fw-bold text-primary">{stats.in_progress}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card text-center h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <h5 className="card-title">Urgent</h5>
                                        <p className="card-text fs-1 fw-bold text-danger">{stats.urgent}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}{/* Filters */}
                    <div className="filters d-flex gap-2 mb-3">
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="form-select"
                            style={{ maxWidth: '200px' }}
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
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>                    {/* Service Demands List */}
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
                                    <div className="card-body pt-2">
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
                    </div>

                    {/* Create Demand Modal */}
                    {showCreateForm && (
                        <div className="modal-overlay">
                            <div className="create-demand-modal">
                                <div className="modal-header">
                                    <h2>Request New Service</h2>                                    <button 
                                        className="close-modal"
                                        onClick={resetCreateForm}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <form onSubmit={handleCreateDemand} className="demand-form">                                    <div className="form-row">
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
                                    </div>                                    {/* Patient Selection for Coordinators */}
                                    {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
                                        <div className="form-group">
                                            <label>Patient *</label>
                                            <div className="patient-selection-container">
                                                <input
                                                    type="text"
                                                    placeholder="Search patients by name or birthdate..."
                                                    value={patientSearch}
                                                    onChange={(e) => setPatientSearch(e.target.value)}
                                                    className="patient-search"
                                                />
                                                <select
                                                    value={newDemand.selected_patient}
                                                    onChange={(e) => setNewDemand({...newDemand, selected_patient: e.target.value})}
                                                    required
                                                    className="patient-select"
                                                >
                                                    <option value="">Select a patient</option>
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
                                                    <small className="search-info">
                                                        {Array.isArray(patients) ? patients.filter(patient => {
                                                            const searchLower = patientSearch.toLowerCase();
                                                            return (
                                                                patient.lastname?.toLowerCase().includes(searchLower) ||
                                                                patient.firstname?.toLowerCase().includes(searchLower) ||
                                                                patient.birth_date?.includes(searchLower)
                                                            );
                                                        }).length : 0} patients found
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    )}                                    {/* Patient Selection/Information for Family Patients */}
                                    {userData?.user?.role === 'Family Patient' && linkedPatients && linkedPatients.length > 0 && (
                                        <div className="form-group">
                                            <label>Patient *</label>
                                            {linkedPatients.length === 1 ? (
                                                // Single patient - show info only
                                                <div className="linked-patient-info">
                                                    <div className="patient-display">
                                                        <strong>{linkedPatients[0].firstname} {linkedPatients[0].lastname}</strong>
                                                        <span className="patient-birthdate">Born: {linkedPatients[0].birth_date}</span>
                                                        <span className="relationship-badge">{linkedPatients[0].relationship || 'Family Member'}</span>
                                                        <small className="patient-note">This service request will be created for your linked patient</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Multiple patients - show selection dropdown
                                                <div className="patient-selection-container">
                                                    <select
                                                        value={newDemand.selected_patient}
                                                        onChange={(e) => setNewDemand({...newDemand, selected_patient: e.target.value})}
                                                        required
                                                        className="patient-select"
                                                    >
                                                        <option value="">Select which patient this request is for</option>
                                                        {linkedPatients.map((patient, index) => (
                                                            <option key={index} value={patient.id}>
                                                                {patient.firstname} {patient.lastname} ({patient.relationship || 'Family Member'}) - Born: {patient.birth_date}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <small className="patient-selection-note">
                                                        You have {linkedPatients.length} linked patients. Please select who this service request is for.
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                    </div>                                    <div className="form-actions">
                                        <button type="button" onClick={resetCreateForm}>
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
                                    </div>                                    {/* Coordinator notes and comments - Visible to all users */}
                                    {selectedDemand.coordinator_notes && (
                                        <div className="coordinator-notes">
                                            <h4>
                                                {userData?.user?.role === 'Patient' ? 'Updates from Care Team:' : 'Coordinator Notes:'}
                                            </h4>
                                            <div className="notes-content">
                                                {selectedDemand.coordinator_notes.split('\n\n').map((note, index) => (
                                                    <div key={index} className="note-entry">
                                                        {note}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}<div className="comment-section">
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

                                        {/* Add Comment - Only for Coordinators/Admin */}
                                        {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
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
                                        )}
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
                                        </div>                                        <div className="detail-row">
                                            <span className="detail-label">Priority:</span>
                                            <span 
                                                className={`badge ${getPriorityBadgeClass(selectedDemand.priority)}`}
                                            >
                                                {selectedDemand.priority}
                                            </span>
                                        </div><div className="detail-row">
                                            <span className="detail-label">Current Status:</span>
                                            <span 
                                                className={`badge ${getStatusBadgeClass(selectedDemand.status)}`}
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
                                                <label>Change Status:</label>                                                <div className="status-buttons d-flex flex-wrap gap-2 mt-2">
                                                    <button 
                                                        className="btn btn-info btn-sm"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Under Review')}
                                                        disabled={selectedDemand.status === 'Under Review'}
                                                    >
                                                        Under Review
                                                    </button>
                                                    <button 
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Approved')}
                                                        disabled={selectedDemand.status === 'Approved'}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'In Progress')}
                                                        disabled={selectedDemand.status === 'In Progress'}
                                                    >
                                                        In Progress
                                                    </button>
                                                    <button 
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Completed')}
                                                        disabled={selectedDemand.status === 'Completed'}
                                                    >
                                                        Complete
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleStatusUpdate(selectedDemand.id, 'Rejected')}
                                                        disabled={selectedDemand.status === 'Rejected'}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}                                    {/* Coordinator Notes Section - Visible to all users */}
                                    <div className="detail-section coordinator-section">
                                        <h3>
                                            {userData?.user?.role === 'Patient' ? 'Updates from Care Team' : 'Coordinator Notes'}
                                        </h3>
                                        {selectedDemand.coordinator_notes ? (
                                            <div className="notes-display">
                                                {selectedDemand.coordinator_notes.split('\n\n').map((note, index) => (
                                                    <div key={index} className="note-entry">
                                                        {note}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-notes">
                                                {userData?.user?.role === 'Patient' ? 'No updates from your care team yet.' : 'No coordinator notes yet.'}
                                            </p>
                                        )}
                                        
                                        {/* Add Comment - Only for Coordinators/Admin */}
                                        {(userData?.user?.role === 'Coordinator' || userData?.user?.role === 'Administrative') && (
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
                                        )}
                                    </div>

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
                                            )}                                            {selectedDemand.managed_by_info && (
                                                <div className="timeline-item">
                                                    <span className="timeline-date">Managed by:</span>
                                                    <span>{selectedDemand.managed_by_info.firstname} {selectedDemand.managed_by_info.lastname}</span>
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
