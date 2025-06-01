import React, { useEffect, useState } from 'react';
import './PatientsPage.css';
import BaseLayout from '../auth/BaseLayout';
import LeftToolbar from '../auth/layout/LeftToolbar';

const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
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
                console.log('[DEBUG] Fetched patient data:', data);
                setPatients(data.results);
            } catch (err) {
                console.error('[DEBUG] Error fetching patients:', err);
                setError(err.message);
            }
        };

        fetchPatients();
    }, []);

    const handleShowDetails = (patient) => {
        setSelectedPatient(patient);
    };

    const handleCloseModal = () => {
        setSelectedPatient(null);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleInputChange = (field, value) => {
        if (field === 'birth_date') {
            setSelectedPatient({ ...selectedPatient, [field]: value });
        } else {
            setSelectedPatient({ ...selectedPatient, [field]: value });
        }
    };

    const refetchPatients = async () => {
        try {
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
            setPatients(data.results);
        } catch (err) {
            console.error('[DEBUG] Error refetching patients:', err);
        }
    };

    const handleSaveChanges = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/update_patient/${selectedPatient.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(selectedPatient),
            });

            if (!response.ok) {
                throw new Error('Failed to update patient details.');
            }

            await response.json();

            // Refetch the patient list after saving changes
            await refetchPatients();

            handleCloseModal();
        } catch (err) {
            console.error('[DEBUG] Error updating patient:', err);
            alert('Failed to save changes. Please try again.');
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.firstname} ${patient.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.national_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.birth_date?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <BaseLayout>
            <LeftToolbar userData={{ user: { role: 'Coordinator' } }} />
            <div className="profile-patient-page">
                <div className="profile-patient-container">
                    <h1>Patients</h1>
                    <input
                        type="text"
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-bar"
                    />
                    {error && <p className="error">{error}</p>}
                    {filteredPatients.length > 0 ? (
                        <div>
                            <ul className="profile-patient-content">
                                {filteredPatients.filter(patient => patient.firstname && patient.lastname).map((patient, index) => (
                                    <li key={index}>
                                        <p><strong>Name:</strong> {patient.firstname} {patient.lastname}  </p>
                                        <button onClick={() => handleShowDetails(patient)}>Show</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p>No patients found.</p>
                    )}
                </div>

                {selectedPatient && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Edit Patient Details</h2>
                            <label>
                                Name:
                                <input
                                    type="text"
                                    value={`${selectedPatient.firstname} ${selectedPatient.lastname}`}
                                    disabled
                                />
                            </label>
                            <label>
                                National Number:
                                <input
                                    type="text"
                                    value={selectedPatient.national_number}
                                    disabled
                                />
                            </label>
                            <label>
                                Birthdate:
                                <input
                                    type="date"
                                    value={selectedPatient.birth_date}
                                    disabled
                                />
                            </label>
                            <label>
                                Gender:
                                <input
                                    type="text"
                                    value={selectedPatient.gender}
                                    onChange={(e) => handleInputChange('gender', e.target.value)}
                                />
                            </label>
                            <label>
                                Blood Type:
                                <input
                                    type="text"
                                    value={selectedPatient.blood_type}
                                    onChange={(e) => handleInputChange('blood_type', e.target.value)}
                                />
                            </label>
                            <label>
                                Emergency Contact:
                                <input
                                    type="text"
                                    value={selectedPatient.emergency_contact}
                                    onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                                />
                            </label>
                            <label>
                                Illness:
                                <input
                                    type="text"
                                    value={selectedPatient.illness}
                                    onChange={(e) => handleInputChange('illness', e.target.value)}
                                />
                            </label>
                            <label>
                                Critical Information:
                                <input
                                    type="text"
                                    value={selectedPatient.critical_information}
                                    onChange={(e) => handleInputChange('critical_information', e.target.value)}
                                />
                            </label>
                            <label>
                                Medication:
                                <input
                                    type="text"
                                    value={selectedPatient.medication}
                                    onChange={(e) => handleInputChange('medication', e.target.value)}
                                />
                            </label>
                            <label>
                                Social Price:
                                <input
                                    type="checkbox"
                                    checked={selectedPatient.social_price}
                                    onChange={(e) => handleInputChange('social_price', e.target.checked)}
                                />
                            </label>
                            <label>
                                Alive:
                                <input
                                    type="checkbox"
                                    checked={selectedPatient.is_alive}
                                    onChange={(e) => handleInputChange('is_alive', e.target.checked)}
                                />
                            </label>
                            <button onClick={handleSaveChanges}>Save</button>
                            <button onClick={handleCloseModal}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </BaseLayout>
    );
};

export default PatientsPage;
