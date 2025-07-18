import React, { useEffect, useState } from 'react';
import PatientLayout from '../../layouts/PatientLayout';
import AddEntryForm from '../../components/AddEntryForm';
import MedicalFolderEnhanced from '../patients/MedicalFolderEnhanced';
import PatientTimeline from '../patients/PatientTimeline';
import { medicalNotesService } from '../../services/medicalNotesService'; // Import medical notes service
import { useCareTranslation } from '../../hooks/useCareTranslation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './PatientsPageNew.css';

const PatientsPageNew = () => {
    const [patients, setPatients] = useState([]);
    const [patientsMedicalCounts, setPatientsMedicalCounts] = useState({}); // Store medical notes count for each patient
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
    const [servicesLoaded, setServicesLoaded] = useState(false);    const [showEditPatientModal, setShowEditPatientModal] = useState(false);    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [sortOrder, setSortOrder] = useState('newest');
    const [showCriticalInfoModal, setShowCriticalInfoModal] = useState(false);
    const [criticalInfoLoading, setCriticalInfoLoading] = useState(false);

    // Use translation hooks
    const { patients: patientsT, common, placeholders, errors, success } = useCareTranslation();

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
                
                // REMOVE THIS LINE - Don't automatically fetch medical notes count
                // if (data.results && data.results.length > 0) {
                //     fetchMedicalNotesCount(data.results);
                // }
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

                if (!response.ok) {
                    throw new Error('Failed to fetch services.');
                }

                const data = await response.json();
                console.log('[DEBUG] Fetched service data:', data);
                
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
    }, []);    const handleShowDetails = (patient) => {
        console.log('[DEBUG] handleShowDetails called with patient:', patient);        console.log('[DEBUG] Current modal states before:', {
            showEditPatientModal,
            showMedicalFolderModal,
            showAddEntryModal
        });
        
        setSelectedPatient(patient);
        setShowEditPatientModal(true);
        console.log('[DEBUG] setShowEditPatientModal(true) called');
        
        // Debug the state right after setting it
        setTimeout(() => {
            console.log('[DEBUG] Modal state after timeout:', showEditPatientModal);
            console.log('[DEBUG] Selected patient after timeout:', selectedPatient);
        }, 100);
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
            });            if (!response.ok) {
                throw new Error('Failed to update patient details.');
            }

            const result = await response.json();
            await refetchPatients();
            handleCloseModal();            // Show success message
            alert(patientsT('patientUpdated') || 'Patient updated successfully!');
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
    };    const handleShowMedicalFolder = (patient) => {
        console.log('[DEBUG] handleShowMedicalFolder called with patient:', patient);
        console.log('[DEBUG] Current modal states before:', {
            showEditPatientModal,
            showMedicalFolderModal,
            showAddEntryModal
        });
        
        // Set the selected patient first
        setSelectedPatient(patient);
        
        // Fetch medical folder data for the patient
        fetchMedicalFolder(patient.id);
        setShowMedicalFolderModal(true);
        console.log('[DEBUG] setShowMedicalFolderModal(true) called');
    };

    const handleCloseMedicalFolderModal = () => {
        setShowMedicalFolderModal(false);
    };

    const handleShowTimeline = (patient) => {
        setSelectedPatient(patient);
        setShowTimelineModal(true);
    };

    const handleCloseTimeline = () => {
        setShowTimelineModal(false);
        setSelectedPatient(null);
    };

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
            };            // Use the existing backend endpoint (underscore format, no /add/)
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
            }            console.log('[DEBUG] Added new entry to medical folder:', { newEntry, selectedService });
            fetchMedicalFolder(selectedPatient.id);
            
            // Refresh the medical notes count for this patient
            refreshPatientMedicalCount(selectedPatient.id);
            
            setNewNote('');
            setSelectedService('');
            alert('Entry added successfully');
        } catch (err) {
            console.error('[DEBUG] Error adding new entry to medical folder:', err);
            alert(err.message);
        }
    };const handleAddEntry = async (patient) => {
        console.log('[DEBUG] handleAddEntry called with patient:', patient);
        console.log('[DEBUG] Current modal states before:', {
            showEditPatientModal,
            showMedicalFolderModal,
            showAddEntryModal
        });
        console.log('[DEBUG] Services available:', services);
        console.log('[DEBUG] Services length:', services.length);
        setShowAddEntryModal(true);
        setSelectedPatient(patient);
        setNewNote('');
        setSelectedService('');

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
            });            if (!response.ok) {
                if (response.status === 404) {
                    // Patient has no medical folder yet, set empty array
                    console.log('[DEBUG] Patient has no medical folder yet (404), setting empty array');
                    setMedicalFolder([]);
                    return;
                }
                throw new Error('Failed to fetch medical folder.');
            }

            const data = await response.json();
            setMedicalFolder(data);        } catch (err) {
            console.error('[DEBUG] Error fetching medical folder:', err);
            if (!err.message.includes('404')) {
                alert('Failed to fetch medical folder.');
            }
            setMedicalFolder([]);
        }
    };    // Function to fetch medical notes count for all patients (sequential to avoid rate limiting)
    const fetchMedicalNotesCount = async (patientList) => {
        try {
            const counts = {};
            
            // Process patients sequentially to prevent overwhelming the backend
            for (const patient of patientList) {
                try {
                    // Use combined count that includes both medical folder and internal notes
                    const count = await medicalNotesService.getCombinedNotesCount(patient.id);
                    counts[patient.id] = count;
                    
                    // Small delay between requests to be gentle on the backend
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error(`Error fetching count for patient ${patient.id}:`, error);
                    counts[patient.id] = 0;
                }
            }
            
            setPatientsMedicalCounts(counts);
        } catch (error) {
            console.error('Error fetching medical notes counts:', error);
        }
    };

    // Function to refresh medical notes count for a specific patient
    const refreshPatientMedicalCount = async (patientId) => {
        try {
            const count = await medicalNotesService.getMedicalNotesCount(patientId);
            setPatientsMedicalCounts(prev => ({
                ...prev,
                [patientId]: count
            }));
        } catch (error) {
            console.error(`Error refreshing count for patient ${patientId}:`, error);
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.firstname} ${patient.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.national_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.birth_date?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Restore handlers
    const handleShowCriticalInfo = async (patient) => {
        setSelectedPatient(patient);
        setShowCriticalInfoModal(true);
        setCriticalInfoLoading(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:8000/account/views_patient/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Find the specific patient in the results
                const patientData = data.results.find(p => p.id === patient.id);
                if (patientData) {
                    // Update the selected patient with fresh data including critical_information
                    setSelectedPatient(patientData);
                }
            } else {
                console.error('Failed to fetch patient data:', response.status);
            }
        } catch (error) {
            console.error('Error fetching patient critical information:', error);
        } finally {
            setCriticalInfoLoading(false);
        }
    };
    const handleCloseCriticalInfo = () => {
        setShowCriticalInfoModal(false);
        setSelectedPatient(null);
        setCriticalInfoLoading(false);
    };

    return (
        <>
            <PatientLayout>
                <div className="patient-page-container">                    <div className="patient-page-content">
                        <h1 className="patient-page-title">{patientsT('title')}</h1>{/* Search Section */}
                        <div className="patient-page-search-container mb-4">
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0">
                                    <svg className="patient-page-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                </span>                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder={placeholders('searchPatients')}
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                            </div>
                        </div>                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                                <svg className="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                {error}
                            </div>                        )}
                        
                        {/* Patient List */}
                        {filteredPatients.length > 0 ? (
                            <div className="patient-page-patients-container">
                                <div className="row g-4">                                    {filteredPatients.filter(patient => patient.firstname && patient.lastname).map((patient, index) => (
                                    <div key={index} className="col-12 col-md-6 col-lg-4 col-xxl-3">
                                        <div className="card h-100 shadow-sm patient-page-patient-item">
                                            <div className="card-body">
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="patient-page-patient-avatar me-3">
                                                        {patient.firstname.charAt(0)}{patient.lastname.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h5 className="card-title mb-1">{patient.firstname} {patient.lastname}</h5>
                                                        <small className="text-muted">ID: {patient.national_number}</small>
                                                    </div>
                                                    {/* Critical Info Icon, right-aligned - always visible */}
                                                    <div className="ms-auto" style={{marginLeft: 'auto', cursor: 'pointer'}} title="View critical information" onClick={() => handleShowCriticalInfo(patient)}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{color: '#dc3545'}}>
                                                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                    </div>
                                                </div>                                                <div className="row g-2 mb-3">
                                                    <div className="col-8">
                                                        <small className="text-muted d-flex align-items-center">
                                                            <svg className="me-1 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                                                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                                                                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                                                                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                                                            </svg>                                                        {patientsT('birth')}: {patient.birth_date}
                                                    </small>
                                                </div>
                                                <div className="col-5">
                                                    <small className="text-muted d-flex align-items-center">
                                                        <svg className="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                            <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        {patient.gender || 'N/A'}
                                                    </small>
                                                </div>
                                                {patient.blood_type && (
                                                    <div className="col-6">
                                                        <small className="text-muted d-flex align-items-center">
                                                            <svg className="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <path d="M7 3V21L12 18L17 21V3H7Z" stroke="currentColor" strokeWidth="2"/>
                                                            </svg>
                                                            {patientsT('bloodType')}: {patient.blood_type}
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="card-footer bg-transparent border-0 pt-0">
                                            <div className="d-flex gap-1 justify-content-center" role="group">
                                                <button 
                                                    className="btn btn-outline-info btn-sm rounded-pill px-2 py-1 text-light" 
                                                    onClick={() => handleShowDetails(patient)}
                                                    title={patientsT('patientDetails')}
                                                    style={{fontSize: '0.75rem'}}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2"/>
                                                    </svg>
                                                    <span className="d-none d-md-inline ms-1">{common('details')}</span>
                                                </button>                                                <button 
                                                    className="btn btn-outline-warning btn-sm rounded-pill px-2 py-1 text-light position-relative" 
                                                    onClick={() => handleShowMedicalFolder(patient)}
                                                    title={patientsT('medicalFolder')}
                                                    style={{fontSize: '0.75rem'}}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="2"/>
                                                    </svg>
                                                    <span className="d-none d-md-inline ms-1">{patientsT('medicalFolder')}</span>                                                    {patientsMedicalCounts[patient.id] > 0 && (
                                                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary" style={{fontSize: '0.6rem', minWidth: '1.2rem'}}>
                                                            {patientsMedicalCounts[patient.id]}
                                                        </span>                                                    )}
                                                </button>
                                                <button 
                                                    className="btn btn-outline-success btn-sm rounded-pill px-2 py-1 text-light" 
                                                    onClick={() => handleShowTimeline(patient)}
                                                    title="Patient Timeline"
                                                    style={{fontSize: '0.75rem'}}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                                                    </svg>
                                                    <span className="d-none d-md-inline ms-1">Timeline</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>                                ))}
                        </div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <svg className="text-muted mb-3" width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21M20.5 11.5L22 13L20.5 14.5M18 13H22M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7Z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            <h4 className="text-muted">{patientsT('noPatients')}</h4>
                            <p className="text-muted">{patientsT('tryAdjustingSearch')}</p>
                        </div>
                    )}
                </div>
            </div>
        </PatientLayout>{/* DEBUG: Visible modal state indicator */}            {/* Patient Edit Modal */}
            {showEditPatientModal && selectedPatient && (
                <div className="patient-page-modal-overlay">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content bg-white">
                            {/* Modal Header */}
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-semibold text-dark">{patientsT('editPatient')}</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={handleCloseEditPatientModal}
                                    aria-label={common('close')}
                                ></button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="modal-body bg-white">
                                <form>
                                    {/* Basic Information Section */}
                                    <div className="mb-4">
                                        <h6 className="text-muted mb-3 text-uppercase fw-bold small">{common('basicInformation')}</h6>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{common('name')}</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-light"
                                                    value={`${selectedPatient.firstname} ${selectedPatient.lastname}`}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{patientsT('nationalNumber')}</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-light"
                                                    value={selectedPatient.national_number}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{patientsT('birthDate')}</label>
                                                <input
                                                    type="date"
                                                    className="form-control bg-light"
                                                    value={selectedPatient.birth_date}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{patientsT('gender')}</label>                                                <select
                                                    className="form-select"
                                                    value={selectedPatient.gender || ''}
                                                    onChange={(e) => handleInputChange('gender', e.target.value)}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="M">Male</option>
                                                    <option value="F">Female</option>
                                                    <option value="O">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="my-4" />

                                    {/* Medical Information Section */}
                                    <div className="mb-4">
                                        <h6 className="text-muted mb-3 text-uppercase fw-bold small">Medical Information</h6>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{patientsT('bloodType')}</label>
                                                <select
                                                    className="form-select"
                                                    value={selectedPatient.blood_type || ''}
                                                    onChange={(e) => handleInputChange('blood_type', e.target.value)}
                                                >
                                                    <option value="">Select Blood Type</option>
                                                    <option value="A+">A+</option>
                                                    <option value="A-">A-</option>
                                                    <option value="B+">B+</option>
                                                    <option value="B-">B-</option>
                                                    <option value="AB+">AB+</option>
                                                    <option value="AB-">AB-</option>
                                                    <option value="O+">O+</option>
                                                    <option value="O-">O-</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium text-dark">{patientsT('emergencyContact')}</label>
                                                <input
                                                    type="text"
                                                    className="form-control mb-2"
                                                    value={selectedPatient.emergency_contact_name || ''}
                                                    readOnly
                                                    placeholder="Emergency contact name"
                                                />
                                                <input
                                                    type="text"
                                                    className="form-control mb-2"
                                                    value={selectedPatient.emergency_contact_phone || ''}
                                                    readOnly
                                                    placeholder="Emergency contact phone"
                                                />
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={selectedPatient.emergency_contact_relationship || ''}
                                                    readOnly
                                                    placeholder="Relationship (e.g., Spouse, Child, Friend)"
                                                />
                                                <small className="text-muted">Emergency contact information is managed in user preferences</small>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label small fw-medium text-dark">{patientsT('illness')}</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="2"
                                                    value={selectedPatient.illness || ''}
                                                    onChange={(e) => handleInputChange('illness', e.target.value)}
                                                    placeholder="Patient's illness or condition"
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label small fw-medium text-dark">{patientsT('criticalInformation')}</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="2"
                                                    value={selectedPatient.critical_information || ''}
                                                    onChange={(e) => handleInputChange('critical_information', e.target.value)}
                                                    placeholder="Critical medical information"
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label small fw-medium text-dark">{patientsT('medication')}</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="2"
                                                    value={selectedPatient.medication || ''}
                                                    onChange={(e) => handleInputChange('medication', e.target.value)}
                                                    placeholder="Current medications"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="my-4" />

                                    {/* Status Information Section */}
                                    <div className="mb-4">
                                        <h6 className="text-muted mb-3 text-uppercase fw-bold small">Status Information</h6>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="socialPrice"
                                                        checked={selectedPatient.social_price || false}
                                                        onChange={(e) => handleInputChange('social_price', e.target.checked)}
                                                    />
                                                    <label className="form-check-label small fw-medium text-dark" htmlFor="socialPrice">
                                                        {patientsT('socialPriceEligible')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="isAlive"
                                                        checked={selectedPatient.is_alive !== false}
                                                        onChange={(e) => handleInputChange('is_alive', e.target.checked)}
                                                    />
                                                    <label className="form-check-label small fw-medium text-dark" htmlFor="isAlive">
                                                        {patientsT('activePatient')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            
                            {/* Modal Footer */}                                            <div className="modal-footer border-top bg-white">
                                <button 
                                    type="button" 
                                    className="btn btn-light me-2" 
                                    onClick={handleCloseEditPatientModal}
                                >
                                    {common('cancel')}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={handleSaveChanges}
                                >
                                    {common('save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}            {/* Enhanced Medical Folder Modal with Internal Notes */}
            {showMedicalFolderModal && selectedPatient && (
                <MedicalFolderEnhanced
                    patient={selectedPatient}
                    medicalData={medicalFolder}
                    services={services}
                    onClose={handleCloseMedicalFolderModal}
                    onAddEntry={() => {
                        setShowMedicalFolderModal(false);
                        handleAddEntry(selectedPatient);
                    }}
                />
            )}

            {/* Add Entry Modal */}
            {showAddEntryModal && services.length > 0 && (
                <div className="patient-page-modal-overlay">
                    <div className="patient-page-modal">
                        <AddEntryForm
                            newNote={newNote}
                            setNewNote={setNewNote}
                            selectedService={selectedService}
                            setSelectedService={setSelectedService}
                            services={services}
                            onSubmit={() => {
                                if (!selectedService) {
                                    alert('Please select a service before submitting.');
                                    return;
                                }
                                handleAddMedicalFolderEntry(newNote);
                                setShowAddEntryModal(false);
                            }}
                            onCancel={() => setShowAddEntryModal(false)}
                        />
                    </div>
                </div>
            )}            {showAddEntryModal && services.length === 0 && (
                <div className="patient-page-modal-overlay">
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content">
                            {/* Modal Header */}
                            <div className="modal-header border-bottom bg-white">
                                <h5 className="modal-title fw-semibold text-dark">Add Entry</h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-dark"
                                    onClick={() => setShowAddEntryModal(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="modal-body bg-white text-center py-4">
                                <div className="spinner-border text-primary mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mb-0 text-muted">Loading services...</p>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="modal-footer border-top bg-white">
                                <button 
                                    type="button" 
                                    className="btn btn-light" 
                                    onClick={() => setShowAddEntryModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>                    </div>
                </div>
            )}            {/* Patient Timeline Modal */}
            {showTimelineModal && selectedPatient && (
                <PatientTimeline
                    patient={selectedPatient}
                    isOpen={showTimelineModal}
                    onClose={handleCloseTimeline}
                />
            )}

            {/* Critical Information Modal */}
            {showCriticalInfoModal && selectedPatient && (
                <div className="patient-page-modal-overlay">
                    <div className="modal-dialog" style={{
                        maxWidth: '500px',
                        width: '90%',
                        margin: '0 auto'
                    }}>
                        <div className="modal-content" style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }}>
                            <div className="modal-header" style={{
                                borderBottom: '1px solid #dee2e6',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h5 className="modal-title mb-0" style={{
                                    color: '#dc3545',
                                    fontWeight: '600'
                                }}>
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Critical Information
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={handleCloseCriticalInfo}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="modal-body" style={{
                                padding: '1.5rem'
                            }}>
                                <div className="mb-3">
                                    <h6 className="text-muted mb-2">Patient:</h6>
                                    <p className="fw-bold mb-0">
                                        {selectedPatient.firstname} {selectedPatient.lastname}
                                    </p>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-2">Critical Information:</h6>
                                    {criticalInfoLoading ? (
                                        <div style={{
                                            backgroundColor: '#f8f9fa',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '6px',
                                            padding: '1rem',
                                            textAlign: 'center',
                                            color: '#6c757d'
                                        }}>
                                            <div className="spinner-border spinner-border-sm me-2" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            Loading critical information...
                                        </div>
                                    ) : (
                                        <div style={{
                                            backgroundColor: '#fff3cd',
                                            border: '1px solid #ffeaa7',
                                            borderRadius: '6px',
                                            padding: '1rem',
                                            color: '#856404'
                                        }}>
                                            {selectedPatient.critical_information && selectedPatient.critical_information.trim() 
                                                ? selectedPatient.critical_information 
                                                : 'No critical information has been recorded for this patient. Critical information can be added through the patient management system.'
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer" style={{
                                borderTop: '1px solid #dee2e6',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={handleCloseCriticalInfo}
                                    style={{
                                        backgroundColor: '#6c757d',
                                        borderColor: '#6c757d',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PatientsPageNew;
