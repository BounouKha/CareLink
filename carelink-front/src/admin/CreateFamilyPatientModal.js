import React, { useState, useEffect } from 'react';

const CreateFamilyPatientModal = ({ userId, onClose, onProfileCreated }) => {
    console.log('CreateFamilyPatientModal rendered with props:', { userId, onClose, onProfileCreated });

    const [formData, setFormData] = useState({
        patient_id: '',
        link: '',
    });
    const [patients, setPatients] = useState([]);
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
            }

            const data = await response.json();
            setPatients(data.results || []);
            console.log('Fetched patients:', data.results);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting form data:', formData);
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/family-patient/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
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
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <h3>Create Family Patient Profile</h3>
                
                <form onSubmit={handleSubmit}>
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
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.firstname} {patient.lastname} (ID: {patient.id})
                                </option>
                            ))}
                        </select>
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
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{ padding: '8px 16px' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none' }}
                        >
                            Create Profile
                        </button>                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFamilyPatientModal;
