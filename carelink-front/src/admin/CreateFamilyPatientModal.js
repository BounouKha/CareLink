import React, { useState, useEffect } from 'react';

const CreateFamilyPatientModal = ({ userId, onClose, onProfileCreated }) => {
    console.log('CreateFamilyPatientModal rendered with props:', { userId, onClose, onProfileCreated });    const [formData, setFormData] = useState({
        patient_id: '',
        link: '',
    });
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

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
            }            const data = await response.json();
            setPatients(data.results || []);
            setFilteredPatients(data.results || []); // Initialize filtered patients
            console.log('Fetched patients:', data.results);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        // Only search when there's some input (at least 1 character)
        if (value.trim().length > 0) {
            const filtered = patients.filter(patient => {
                const fullName = `${patient.firstname} ${patient.lastname}`.toLowerCase();
                const searchValue = value.toLowerCase();
                
                return (
                    fullName.includes(searchValue) ||
                    (patient.national_number && patient.national_number.toLowerCase().includes(searchValue)) ||
                    (patient.birthdate && patient.birthdate.includes(searchValue))
                );
            });
            setFilteredPatients(filtered);
        } else {
            // Show all patients when search is empty
            setFilteredPatients(patients);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting form data:', formData);
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }            const response = await fetch(`http://localhost:8000/account/familypatient/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user: userId,
                    patient: formData.patient_id,
                    link: formData.link
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create family patient profile.');
            }

            const data = await response.json();
            console.log('Profile created successfully:', data);
            onProfileCreated(data);
            alert('Family Patient profile created successfully!');
            onClose();
        } catch (err) {
            console.error('Error creating profile:', err);
            alert(err.message);
        }
    };

    return (        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-users me-2 text-primary"></i>
                            Create Family Patient Profile
                        </h4>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    <div className="modal-body">
                        <h3>Create Family Patient Profile</h3>
                
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
                            Type at least 1 character to search
                        </small>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label>Select Patient:</label>
                        <select
                            name="patient_id"
                            value={formData.patient_id}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                            required
                        >
                            <option value="">Select a patient...</option>
                            {filteredPatients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.firstname} {patient.lastname} 
                                    {patient.national_number && ` (${patient.national_number})`}
                                    {patient.birthdate && ` - Born: ${patient.birthdate}`}
                                </option>
                            ))}
                        </select>
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
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label>Relationship:</label>
                        <input
                            type="text"
                            name="link"
                            value={formData.link}
                            onChange={handleChange}
                            placeholder="e.g., Spouse, Child, Parent"
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                            required
                        />
                    </div>                    
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
                            disabled={!formData.patient_id || !formData.link}
                            style={{ 
                                padding: '10px 20px',
                                backgroundColor: formData.patient_id && formData.link ? '#28a745' : '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: formData.patient_id && formData.link ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: formData.patient_id && formData.link ? 1 : 0.6
                            }}
                            onMouseOver={(e) => {
                                if (formData.patient_id && formData.link) {
                                    e.target.style.backgroundColor = '#218838';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (formData.patient_id && formData.link) {
                                    e.target.style.backgroundColor = '#28a745';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}                        >
                            <i className="fas fa-user-plus"></i>
                            Create Profile
                        </button>
                    </div>
                </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateFamilyPatientModal;
