import React, { useEffect, useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from '../../auth/layout/BaseLayout';
import AddEntryForm from '../../components/AddEntryForm';
// Import page-specific CSS for components not covered by unified styles
import './PatientsPage.css';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [medicalFolder, setMedicalFolder] = useState([]);
    const [showMedicalFolderModal, setShowMedicalFolderModal] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [newEntry, setNewEntry] = useState('');
    const [showAddEntryModal, setShowAddEntryModal] = useState(false);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [servicesLoaded, setServicesLoaded] = useState(false);
    const [showEditPatientModal, setShowEditPatientModal] = useState(false);
    const [sortOrder, setSortOrder] = useState('newest'); // New state for sorting

    // Debug effect to track modal state changes
    useEffect(() => {
        console.log('[DEBUG] Modal states changed:', {
            showEditPatientModal,
            showMedicalFolderModal,
            showAddEntryModal
        });
    }, [showEditPatientModal, showMedicalFolderModal, showAddEntryModal]);

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
                }

                const data = await response.json();
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
        console.log('[DEBUG] handleShowDetails called with patient:', patient);
        setSelectedPatient(patient);
        setShowEditPatientModal(true);
        console.log('[DEBUG] setShowEditPatientModal(true) called');
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
    };    const fetchMedicalFolder = async (patientId) => {
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
                if (response.status === 404) {
                    // Patient has no medical folder yet, set empty array
                    console.log('[DEBUG] Patient has no medical folder yet (404), setting empty array');
                    setMedicalFolder([]);
                    return;
                }
                console.error('[DEBUG] Failed response:', response);
                throw new Error('Failed to fetch medical folder.');
            }

            const data = await response.json();
            console.log('[DEBUG] Fetched medical folder data:', data);
            setMedicalFolder(data);
        } catch (err) {
            console.error('[DEBUG] Error fetching medical folder:', err);
            if (!err.message.includes('404')) {
                alert('Failed to fetch medical folder.');
            }
            setMedicalFolder([]);
        }
    };

    const handleShowMedicalFolder = (patientId) => {
        console.log('[DEBUG] handleShowMedicalFolder called with patientId:', patientId);
        console.log('[DEBUG] Medical Folder button clicked for patientId:', patientId);
        fetchMedicalFolder(patientId);
        setShowMedicalFolderModal(true);
        console.log('[DEBUG] setShowMedicalFolderModal(true) called');
    };

    const handleCloseMedicalFolderModal = () => {
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
    };

    const handleSortOrderChange = (e) => {
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
    };    const handleAddMedicalFolderEntry = async (newEntry) => {
        try {
            if (!selectedPatient) {
                throw new Error('No patient selected. Please select a patient.');
            }

            console.log('[DEBUG] Add Entry button clicked:', { patientId: selectedPatient.id, newEntry, selectedService });

            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const requestBody = { 
                note: newEntry, 
                service_id: selectedService,
                patient_id: selectedPatient.id // Explicitly include patient ID
            };
            console.log('[DEBUG] Request body:', requestBody);
            console.log('[DEBUG] About to send POST request with body:', JSON.stringify(requestBody, null, 2));

            // Use the modern /add/ endpoint that doesn't require folder_id
            const response = await fetch(`http://localhost:8000/account/medical-folder/${selectedPatient.id}/add/`, {
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

            console.log('[DEBUG] Added new entry to medical folder:', { newEntry, selectedService });
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
    };

    const handleAddEntry = async (patient) => {
        console.log('[DEBUG] handleAddEntry called with patient:', patient);
        console.log('[DEBUG] Services available when opening modal:', services);
        setShowAddEntryModal(true);
        console.log('[DEBUG] setShowAddEntryModal(true) called');
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
    );

    // Add translation hooks
    const { patients: patientsT, common, placeholders, errors, success } = useCareTranslation();

    return (
        <>
            <BaseLayout>
                <div className="page-container">
                    <div className="content-container">
                        <h1>Patients</h1>

                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="form-control"
                        />

                        {error && <p className="error">{error}</p>}
                        
                        {/* Patient List */}
                        {filteredPatients.length > 0 ? (
                            <div className="patients-list">
                                {filteredPatients.filter(patient => patient.firstname && patient.lastname).map((patient, index) => (
                                    <div key={index} className="patient-item">
                                        <div className="patient-info">
                                            <div className="patient-details">
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">{patientsT('name')}</div>
                                                    <div className="patient-detail-value">{patient.firstname} {patient.lastname}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">{patientsT('nationalNumber')}</div>
                                                    <div className="patient-detail-value">{patient.national_number}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">{patientsT('birthDate')}</div>
                                                    <div className="patient-detail-value">{patient.birth_date}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">{patientsT('gender')}</div>
                                                    <div className="patient-detail-value">{patient.gender || 'N/A'}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">{patientsT('bloodType')}</div>
                                                    <div className="patient-detail-value">{patient.blood_type || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="patient-actions">
                                            <button 
                                                className="btn-sm btn-info" 
                                                onClick={() => handleShowDetails(patient)}
                                                title="Patient Information"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Info
                                            </button>

                                            <button 
                                                className="btn-sm btn-warning" 
                                                onClick={() => handleShowMedicalFolder(patient.id)}
                                                title="Medical Folder"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Medical Folder
                                            </button>

                                            <button 
                                                className="btn-sm btn-success" 
                                                onClick={() => handleAddEntry(patient)}
                                                title="Add Entry"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Add Entry
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-patients">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <path d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21M20.5 11.5L22 13L20.5 14.5M18 13H22M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <p>No patients found</p>
                            </div>
                        )}
                    </div>
                </div>
            </BaseLayout>

            {/* Patient Edit Modal */}
            {showEditPatientModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Patient Details</h2>
                            <button 
                                className="close" 
                                onClick={handleCloseEditPatientModal}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
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
                            <div className="form-group">
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
                            <div className="form-group">
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

                            <div className="modal-actions">
                                <button className="btn" onClick={handleSaveChanges}>Save Changes</button>
                                <button className="cancel-btn" onClick={handleCloseEditPatientModal}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Medical Folder Modal */}
            {showMedicalFolderModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Medical Folder</h2>
                            <button 
                                className="close" 
                                onClick={handleCloseMedicalFolderModal}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
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
                            </div>

                            {medicalFolder.length > 0 ? (
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
                            
                            <div className="modal-actions">
                                <button className="btn" onClick={handleCloseMedicalFolderModal}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Entry Modal */}
            {showAddEntryModal && services.length > 0 && (
                <div className="modal-overlay">
                    <div className="modal">
                        <AddEntryForm
                            newNote={newNote}
                            setNewNote={setNewNote}
                            selectedService={selectedService}
                            setSelectedService={setSelectedService}
                            services={services}
                            onSubmit={() => {
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
                </div>
            )}

            {/* Add Entry Modal - Loading State */}
            {showAddEntryModal && services.length === 0 && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Add Entry</h2>
                            <button 
                                className="close" 
                                onClick={() => setShowAddEntryModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Loading services...</p>
                            <div className="modal-actions">
                                <button className="cancel-btn" onClick={() => setShowAddEntryModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PatientsPage;
