import React, { useState, useEffect } from 'react';

const NewEntryModal = ({ show, onClose, familyPatientId, onSuccess }) => {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatients, setSelectedPatients] = useState([]);
    const [selectedRelationships, setSelectedRelationships] = useState({});
    const [loading, setLoading] = useState(false);

    // Fetch available patients on modal open
    useEffect(() => {
        if (show && familyPatientId) {
            fetchPatients();
        }
    }, [show, familyPatientId]);

    // Filter patients based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredPatients(patients);
        } else {
            const searchLower = searchTerm.toLowerCase();
            const filtered = patients.filter(patient => {
                const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
                return (
                    fullName.includes(searchLower) ||
                    (patient.national_number && patient.national_number.toLowerCase().includes(searchLower)) ||
                    (patient.birthdate && patient.birthdate.includes(searchTerm))
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
            setPatients(data.results || []);
            setFilteredPatients(data.results || []);
            console.log('Fetched patients:', data.results);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePatientToggle = (patient) => {
        setSelectedPatients(prev => {
            const isSelected = prev.some(p => p.id === patient.id);
            if (isSelected) {
                // Remove patient and their relationship
                const newSelected = prev.filter(p => p.id !== patient.id);
                const newRelationships = { ...selectedRelationships };
                delete newRelationships[patient.id];
                setSelectedRelationships(newRelationships);
                return newSelected;
            } else {
                // Add patient
                return [...prev, patient];
            }
        });
    };

    const handleRelationshipChange = (patientId, relationship) => {
        setSelectedRelationships(prev => ({
            ...prev,
            [patientId]: relationship
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedPatients.length === 0) {
            alert('Please select at least one patient.');
            return;
        }

        // Check if all selected patients have relationships assigned
        const missingRelationships = selectedPatients.filter(patient => 
            !selectedRelationships[patient.id] || !selectedRelationships[patient.id].trim()
        );

        if (missingRelationships.length > 0) {
            alert('Please assign relationships for all selected patients.');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Create relationships for each selected patient
            const promises = selectedPatients.map(patient => {
                const formData = {
                    patient_id: patient.id,
                    link: selectedRelationships[patient.id]
                };

                return fetch(`http://localhost:8000/account/users/${familyPatientId}/create/family-patient/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user_id: familyPatientId, role_specific_data: formData }),
                });
            });

            const responses = await Promise.all(promises);
            
            // Check if all requests were successful
            const failed = responses.filter(response => !response.ok);
            if (failed.length > 0) {
                throw new Error(`Failed to create ${failed.length} relationships.`);
            }

            console.log('All relationships created successfully');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating relationships:', err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <h3>Add New Patient Relationships</h3>
                
                <form onSubmit={handleSubmit}>
                    {/* Search Bar */}
                    <div style={{ marginBottom: '15px' }}>
                        <label>Search Patients:</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search by name, national number, or birthdate..."
                            style={{ 
                                width: '100%', 
                                padding: '8px', 
                                marginTop: '5px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                        <small style={{ color: '#666', fontSize: '12px' }}>
                            Type to search and select patients to add relationships
                        </small>
                    </div>

                    {/* Patient List */}
                    <div style={{ marginBottom: '15px' }}>
                        <label>Available Patients:</label>
                        <div style={{ 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            border: '1px solid #ddd', 
                            borderRadius: '4px',
                            padding: '8px',
                            marginTop: '5px'
                        }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    Loading patients...
                                </div>
                            ) : filteredPatients.length > 0 ? (
                                filteredPatients.map(patient => (
                                    <div key={patient.id} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: '8px',
                                        borderBottom: '1px solid #f0f0f0',
                                        backgroundColor: selectedPatients.some(p => p.id === patient.id) ? '#e8f5e8' : 'transparent'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPatients.some(p => p.id === patient.id)}
                                            onChange={() => handlePatientToggle(patient)}
                                            style={{ marginRight: '10px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <strong>{patient.firstname} {patient.lastname}</strong>
                                            {patient.national_number && (
                                                <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                                                    ({patient.national_number})
                                                </span>
                                            )}
                                            {patient.birthdate && (
                                                <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                                                    Born: {patient.birthdate}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                    {searchTerm ? 'No patients found matching your search criteria' : 'No patients available'}
                                </div>
                            )}
                        </div>
                        {searchTerm && filteredPatients.length === 0 && (
                            <small style={{ color: '#999', fontSize: '12px' }}>
                                No patients found matching your search criteria
                            </small>
                        )}
                        {!searchTerm && patients.length > 0 && (
                            <small style={{ color: '#666', fontSize: '12px' }}>
                                Showing all {patients.length} patients. Use search to filter.
                            </small>
                        )}
                    </div>

                    {/* Selected Patients and Relationships */}
                    {selectedPatients.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <label>Assign Relationships:</label>
                            <div style={{ 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                padding: '10px',
                                marginTop: '5px',
                                backgroundColor: '#f8f9fa'
                            }}>
                                {selectedPatients.map(patient => (
                                    <div key={patient.id} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        marginBottom: '10px',
                                        padding: '8px',
                                        backgroundColor: 'white',
                                        borderRadius: '4px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <strong>{patient.firstname} {patient.lastname}</strong>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g., Spouse, Child, Parent"
                                            value={selectedRelationships[patient.id] || ''}
                                            onChange={(e) => handleRelationshipChange(patient.id, e.target.value)}
                                            style={{ 
                                                width: '150px', 
                                                padding: '6px', 
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        justifyContent: 'flex-end',
                        marginTop: '20px',
                        paddingTop: '15px',
                        borderTop: '1px solid #e9ecef'
                    }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{ 
                                padding: '10px 20px',
                                border: '1px solid #6c757d',
                                backgroundColor: '#f8f9fa',
                                color: '#6c757d',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#e9ecef';
                                e.target.style.borderColor = '#5a6268';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.borderColor = '#6c757d';
                            }}
                        >
                            <i className="fas fa-times"></i>
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || selectedPatients.length === 0}
                            style={{ 
                                padding: '10px 20px',
                                backgroundColor: (selectedPatients.length > 0 && !loading) ? '#28a745' : '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: (selectedPatients.length > 0 && !loading) ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: (selectedPatients.length > 0 && !loading) ? 1 : 0.6
                            }}
                            onMouseOver={(e) => {
                                if (selectedPatients.length > 0 && !loading) {
                                    e.target.style.backgroundColor = '#218838';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (selectedPatients.length > 0 && !loading) {
                                    e.target.style.backgroundColor = '#28a745';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}
                        >
                            <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-user-plus"}></i>
                            {loading ? 'Adding...' : `Add ${selectedPatients.length} Relationship${selectedPatients.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewEntryModal;
