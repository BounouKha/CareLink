import React, { useState, useEffect } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const AddRelationModal = ({ familyPatientId, onClose, onRelationAdded }) => {
    console.log('[DEBUG] AddRelationModal rendered with props:', { familyPatientId, onClose, onRelationAdded });
    
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatients, setSelectedPatients] = useState([]);
    const [relation, setRelation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        // Filter patients based on search term
        if (!searchTerm) {
            setFilteredPatients(patients);
        } else {
            const filtered = patients.filter(patient => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    patient.firstname?.toLowerCase().includes(searchLower) ||
                    patient.lastname?.toLowerCase().includes(searchLower) ||
                    patient.national_number?.toLowerCase().includes(searchLower)
                );
            });
            setFilteredPatients(filtered);
        }
    }, [searchTerm, patients]);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch('http://localhost:8000/account/views_patient/', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch patients.');
            }

            const data = await response.json();
            // Filter out patients with null or invalid IDs
            const validPatients = (data.results || []).filter(patient => 
                patient.id && 
                patient.firstname && 
                patient.lastname &&
                patient.is_alive !== false
            );
            setPatients(validPatients);
            setFilteredPatients(validPatients);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError('Failed to load patients. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSelect = (patient) => {
        if (selectedPatients.find(p => p.id === patient.id)) {
            setSelectedPatients(selectedPatients.filter(p => p.id !== patient.id));
        } else {
            setSelectedPatients([...selectedPatients, patient]);
        }
    };    const handleAddRelations = async () => {
        if (selectedPatients.length === 0) {
            setError('Please select at least one patient to add as a relation.');
            return;
        }

        if (!relation.trim()) {
            setError('Please specify the relationship.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }            // Send all selected patient IDs in a single request
            const response = await fetch(`http://localhost:8000/account/familypatient/${familyPatientId}/add-relation/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    patient_ids: selectedPatients.map(patient => patient.id),
                    relationship: relation.trim()
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Call the callback to refresh the family patient data
            if (onRelationAdded) {
                onRelationAdded();
            }

            // Show success message with details
            let message = result.message || `Successfully added ${selectedPatients.length} new relation(s)!`;
            if (result.skipped_existing > 0) {
                message += ` (${result.skipped_existing} already existed)`;
            }
            if (result.invalid_patients > 0) {
                message += ` (${result.invalid_patients} invalid patients)`;
            }
            
            alert(message);
            onClose();
        } catch (err) {
            console.error('Error adding relations:', err);
            setError(err.message || 'Failed to add relations. Please try again.');
        } finally {
            setLoading(false);
        }
    };    return (
        <div 
            className="modal fade show d-block" 
            tabIndex="-1" 
            style={{ 
                backgroundColor: 'rgba(0,0,0,0.7)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1050,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div className="modal-dialog modal-dialog-centered modal-xl" style={{ margin: 0 }}>
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">
                            <i className="fas fa-users me-2"></i>
                            Add New Relations
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {error}
                            </div>
                        )}
                        
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header bg-light">
                                        <h6 className="card-title mb-0">
                                            <i className="fas fa-heart me-2"></i>
                                            Relationship Information
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-3">
                                            <label htmlFor="relationship" className="form-label fw-medium">
                                                Relationship *
                                            </label>
                                            <input
                                                type="text"
                                                id="relationship"
                                                className="form-control"
                                                value={relation}
                                                onChange={(e) => setRelation(e.target.value)}
                                                placeholder="e.g., Child, Parent, Spouse, etc."
                                                disabled={loading}
                                                required
                                            />
                                            <small className="form-text text-muted">
                                                Specify how the selected patients are related to this family member
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header bg-light">
                                        <h6 className="card-title mb-0">
                                            <i className="fas fa-search me-2"></i>
                                            Patient Search
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-3">
                                            <label htmlFor="patient-search" className="form-label fw-medium">
                                                Search Patients
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="fas fa-search"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    id="patient-search"
                                                    className="form-control"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Search by name or national number..."
                                                    disabled={loading}
                                                />
                                            </div>
                                            <small className="form-text text-muted">
                                                Find patients by name or identification number
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="card mt-3">
                            <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                <h6 className="card-title mb-0">
                                    <i className="fas fa-user-injured me-2"></i>
                                    Select Patients ({selectedPatients.length} selected)
                                </h6>
                                {selectedPatients.length > 0 && (
                                    <span className="badge bg-primary">
                                        {selectedPatients.length} selected
                                    </span>
                                )}
                            </div>
                            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary me-2" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        Loading patients...
                                    </div>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="alert alert-info" role="alert">
                                        <i className="fas fa-info-circle me-2"></i>
                                        {searchTerm ? 'No patients found matching your search.' : 'No patients available.'}
                                    </div>
                                ) : (
                                    <div className="row g-2">
                                        {filteredPatients.map(patient => (
                                            <div key={patient.id} className="col-md-6 col-lg-4">
                                                <div
                                                    className={`card h-100 cursor-pointer ${
                                                        selectedPatients.find(p => p.id === patient.id) 
                                                            ? 'border-primary bg-primary bg-opacity-10' 
                                                            : 'border-light'
                                                    }`}
                                                    onClick={() => handlePatientSelect(patient)}
                                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <div className="card-body p-3">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1">
                                                                <h6 className="card-title mb-1">
                                                                    {patient.firstname} {patient.lastname}
                                                                </h6>
                                                                <div className="small text-muted">
                                                                    {patient.national_number && (
                                                                        <div>
                                                                            <i className="fas fa-id-card me-1"></i>
                                                                            ID: {patient.national_number}
                                                                        </div>
                                                                    )}
                                                                    {patient.birth_date && (
                                                                        <div>
                                                                            <i className="fas fa-birthday-cake me-1"></i>
                                                                            Born: {patient.birth_date}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="ms-2">
                                                                {selectedPatients.find(p => p.id === patient.id) ? (
                                                                    <i className="fas fa-check-circle text-primary"></i>
                                                                ) : (
                                                                    <i className="far fa-circle text-muted"></i>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPatients.length > 0 && (
                            <div className="card mt-3">
                                <div className="card-header bg-success text-white">
                                    <h6 className="card-title mb-0">
                                        <i className="fas fa-check me-2"></i>
                                        Selected Patients
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="d-flex flex-wrap gap-2">
                                        {selectedPatients.map(patient => (
                                            <span key={patient.id} className="badge bg-success bg-opacity-75 text-dark d-flex align-items-center">
                                                {patient.firstname} {patient.lastname}
                                                <button 
                                                    onClick={() => handlePatientSelect(patient)}
                                                    className="btn btn-sm ms-2 p-0"
                                                    style={{ background: 'none', border: 'none', color: 'inherit' }}
                                                    disabled={loading}
                                                    aria-label="Remove patient"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button 
                            type="button"
                            className="btn btn-secondary" 
                            onClick={onClose}
                            disabled={loading}
                        >
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button 
                            type="button"
                            className="btn btn-primary" 
                            onClick={handleAddRelations}
                            disabled={loading || selectedPatients.length === 0 || !relation.trim()}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner-border spinner-border-sm me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-plus me-2"></i>
                                    Add {selectedPatients.length} Relation(s)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddRelationModal;
