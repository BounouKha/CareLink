import React, { useEffect, useState } from 'react';
import './PatientsPage.css';
import BaseLayout from '../../auth/layout/BaseLayout';
import AddEntryForm from '../../components/AddEntryForm';

const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [medicalFolder, setMedicalFolder] = useState([]);
    const [showMedicalFolderModal, setShowMedicalFolderModal] = useState(false);
    const [newNote, setNewNote] = useState('');    const [newEntry, setNewEntry] = useState('');
    const [showAddEntryModal, setShowAddEntryModal] = useState(false);    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [servicesLoaded, setServicesLoaded] = useState(false);
    const [showEditPatientModal, setShowEditPatientModal] = useState(false);
    const [sortOrder, setSortOrder] = useState('newest'); // New state for sorting

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

        const fetchServices = async () => {
            try {
                setIsLoadingServices(true);
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('No access token found. Please log in.');
                }

                console.log('[DEBUG] Fetching services from backend...');
                const response = await fetch('http://localhost:8000/account/services/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('[DEBUG] Response status:', response.status);
                console.log('[DEBUG] Response headers:', response.headers);

                if (!response.ok) {
                    throw new Error('Failed to fetch services.');
                }                const data = await response.json();
                console.log('[DEBUG] Fetched service data:', data);
                console.log('[DEBUG] typeof data:', typeof data);
                console.log('[DEBUG] Array.isArray(data):', Array.isArray(data));
                
                // The services API returns a direct array
                setServices(data);
                setServicesLoaded(true);
                console.log('[DEBUG] Services set successfully:', data);
            } catch (err) {
                console.error('[DEBUG] Error fetching services:', err);
                setError(err.message);
            } finally {
                setIsLoadingServices(false);
            }
        };

        fetchPatients();
        fetchServices();
    }, []);

    const handleShowDetails = (patient) => {
        setSelectedPatient(patient);
        setShowEditPatientModal(true);
    };

    const handleCloseEditPatientModal = () => {
        setShowEditPatientModal(false);
        setSelectedPatient(null);
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

    const fetchMedicalFolder = async (patientId) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/medical_folder/${patientId}/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('[DEBUG] Request sent to fetch medical folder:', {
                url: `http://localhost:8000/account/medical_folder/${patientId}/`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error('[DEBUG] Failed response:', response);
                throw new Error('Failed to fetch medical folder.');
            }

            const data = await response.json();
            console.log('[DEBUG] Fetched medical folder data:', data);
            setMedicalFolder(data);
        } catch (err) {
            console.error('[DEBUG] Error fetching medical folder:', err);
            alert('Failed to fetch medical folder.');
        }
    };

    const handleShowMedicalFolder = (patientId) => {
        console.log('[DEBUG] Medical Folder button clicked for patientId:', patientId);
        fetchMedicalFolder(patientId);
        setShowMedicalFolderModal(true);
    };    const handleCloseMedicalFolderModal = () => {
        setShowMedicalFolderModal(false);
    };

    // Function to sort medical folder entries
    const getSortedMedicalFolder = () => {
        const sortedEntries = [...medicalFolder];
        if (sortOrder === 'newest') {
            return sortedEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            return sortedEntries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
    };    const handleSortOrderChange = (e) => {
        setSortOrder(e.target.value);
    };

    // Function to format date for better readability
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };const handleAddMedicalFolderEntry = async (newEntry) => {
        try {
            if (!selectedPatient || medicalFolder.length === 0) {
                throw new Error('No patient or medical folder selected. Please select a patient and ensure the medical folder is loaded.');
            }

            const folderId = medicalFolder[0].id; // Assuming the first folder entry contains the folder ID
            console.log('[DEBUG] Add Entry button clicked:', { patientId: selectedPatient.id, folderId, newEntry, selectedService });

            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }            const requestBody = { 
                note: newEntry, 
                folder_id: folderId,
                service_id: selectedService // Include the service ID
            };
            console.log('[DEBUG] Request body:', requestBody);
            console.log('[DEBUG] About to send POST request with body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`http://localhost:8000/account/medical_folder/${selectedPatient.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('Failed to add new entry to medical folder.');
            }

            console.log('[DEBUG] Added new entry to medical folder:', { folderId, newEntry, selectedService });
            fetchMedicalFolder(selectedPatient.id); // Refresh the medical folder entries

            // Clear the form fields
            setNewNote('');
            setSelectedService('');

            // Display success message
            alert('Successful');
        } catch (err) {
            console.error('[DEBUG] Error adding new entry to medical folder:', err);
            alert(err.message);
        }
    };    const handleAddEntry = async (patient) => {
        console.log('[DEBUG] Services available when opening modal:', services);
        setShowAddEntryModal(true);
        setSelectedPatient(patient); // Ensure the full patient object is set
        setNewNote('');
        setSelectedService('');

        console.log('[DEBUG] Patient passed to handleAddEntry:', patient); // Debug log

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/medical_folder/${patient.id}/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch medical folder.');
            }

            const data = await response.json();
            setMedicalFolder(data);
        } catch (err) {
            console.error('[DEBUG] Error fetching medical folder:', err);
            alert('Failed to fetch medical folder.');
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.firstname} ${patient.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.national_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.birth_date?.toLowerCase().includes(searchTerm.toLowerCase())
    );    return (
        <BaseLayout>
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
                                        <p><strong>Name:</strong> {patient.firstname} {patient.lastname}</p>
                                        <button onClick={() => handleShowDetails(patient)}>Patient Information</button>
                                        <button onClick={() => handleShowMedicalFolder(patient.id)}>Medical Folder</button>
                                        <button onClick={() => handleAddEntry(patient)}>Add Entry</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p>No patients found.</p>
                    )}
                
                </div>                {/* Modal Overlay */}
                {(showEditPatientModal || showMedicalFolderModal || showAddEntryModal) && (
                    <div className="modal-overlay"></div>
                )}
                
                {showEditPatientModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Edit Patient Details</h2>                                <button 
                                    className="modal-close-button" 
                                    onClick={handleCloseEditPatientModal}
                                >
                                    ×
                                </button>
                            </div>
                            
                            {/* Basic Information Section */}
                            <div className="patient-form-section">
                                <h3>Basic Information</h3>
                                <div className="patient-form-grid">
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
                                </div>
                            </div>

                            {/* Medical Information Section */}
                            <div className="patient-form-section">
                                <h3>Medical Information</h3>
                                <div className="patient-form-grid">
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
                                </div>
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
                            </div>

                            {/* Status Information Section */}
                            <div className="patient-form-section">
                                <h3>Status Information</h3>
                                <div className="patient-form-grid">
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
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="patient-form-buttons">
                                <button onClick={handleSaveChanges}>Save Changes</button>
                                <button onClick={handleCloseEditPatientModal}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}{showMedicalFolderModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Medical Folder</h2>                                <button 
                                    className="modal-close-button" 
                                    onClick={handleCloseMedicalFolderModal}
                                >
                                    ×
                                </button>
                            </div>
                              {/* Sorting dropdown */}
                            <div className="medical-folder-sort">
                                <label htmlFor="sortOrder">
                                    Sort by:
                                </label>
                                <select 
                                    id="sortOrder"
                                    value={sortOrder} 
                                    onChange={handleSortOrderChange}
                                >
                                    <option value="newest">Newest to Oldest</option>
                                    <option value="oldest">Oldest to Newest</option>
                                </select>
                            </div>                            {medicalFolder.length > 0 ? (
                                <ul>
                                    {getSortedMedicalFolder().map((entry, index) => (
                                        <li key={index}>
                                            <p><strong>Date:</strong> {formatDate(entry.created_at)}</p>
                                            <p><strong>Note:</strong> {entry.note}</p>
                                            <p><strong>Service:</strong> {entry.service || 'N/A'}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No medical folder entries found.</p>
                            )}
                            <button onClick={handleCloseMedicalFolderModal}>Close</button>
                        </div>
                    </div>
                )}{showAddEntryModal && services.length > 0 && (
                    <div className="modal">
                        <AddEntryForm
                            newNote={newNote}
                            setNewNote={setNewNote}
                            selectedService={selectedService}
                            setSelectedService={setSelectedService}
                            services={services}                            onSubmit={() => {
                                console.log('[DEBUG] Submit clicked - selectedService:', selectedService);
                                console.log('[DEBUG] Submit clicked - selectedService type:', typeof selectedService);
                                console.log('[DEBUG] Submit clicked - newNote:', newNote);
                                console.log('[DEBUG] Submit clicked - services array:', services);
                                
                                // Find the selected service object
                                const selectedServiceObj = services.find(service => service.id == selectedService);
                                console.log('[DEBUG] Selected service object:', selectedServiceObj);
                                
                                if (!selectedService) {
                                    alert('Please select a service before submitting.');
                                    return;
                                }
                                handleAddMedicalFolderEntry(newNote);
                                setShowAddEntryModal(false); // Close modal after successful submission
                            }}
                            onCancel={() => setShowAddEntryModal(false)}
                        />
                    </div>
                )}

                {showAddEntryModal && services.length === 0 && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Add Entry</h2>
                            <p>Loading services...</p>
                            <button onClick={() => setShowAddEntryModal(false)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </BaseLayout>
    );
};

export default PatientsPage;
