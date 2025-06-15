import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import BaseLayout from '../../auth/layout/BaseLayout';
import { SpinnerOnly } from '../../components/LoadingComponents';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import AddEntryForm from './AddEntryForm';
import MedicalFolderModal from './MedicalFolderModal'; // Add this import

const PatientsPageNew = () => {
    const [patients, setPatients] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalStates, setModalStates] = useState({
        showAddEntryModal: false,
        showMedicalFolderModal: false
    });
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicalFolderData, setMedicalFolderData] = useState([]);

    const { patients: patientTranslations, common } = useCareTranslation();

    useEffect(() => {
        fetchPatients();
        fetchServices();
    }, []);

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:8000/account/views_patient/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPatients(data.results);
            } else {
                setError('Failed to fetch patients');
            }
        } catch (error) {
            setError('Error fetching patients');
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
    };

    const handleAddEntry = (patient) => {
        console.log('[DEBUG] handleAddEntry called with patient:', patient);
        setSelectedPatient(patient);
        setModalStates(prev => ({
            ...prev,
            showAddEntryModal: true
        }));
    };

    const handleAddMedicalFolderEntry = async (entryData) => {
        try {
            console.log('[DEBUG] Adding medical folder entry with data:', entryData);
            console.log('[DEBUG] Entry data patient_id:', entryData.patient_id);
            console.log('[DEBUG] Current selectedPatient:', selectedPatient);
            
            // Ensure we have a patient ID - check both entryData and selectedPatient
            let patientId = entryData.patient_id;
            if (!patientId && selectedPatient) {
                patientId = selectedPatient.id;
                entryData.patient_id = patientId; // Add it to entryData
            }
            
            if (!patientId) {
                console.error('[DEBUG] No patient ID found in:', {
                    entryData,
                    selectedPatient
                });
                throw new Error('No patient ID provided for medical folder entry');
            }

            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            console.log('[DEBUG] Sending request to endpoint:', `http://localhost:8000/account/medical-folder/${patientId}/add/`);
            console.log('[DEBUG] Request payload:', {
                date: entryData.date,
                illness: entryData.illness,
                notes: entryData.notes,
                service_id: entryData.service_id || null
            });

            const response = await fetch(`http://localhost:8000/account/medical-folder/${patientId}/add/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: entryData.date,
                    illness: entryData.illness,
                    notes: entryData.notes,
                    service_id: entryData.service_id || null,
                    patient_id: patientId // Explicitly include patient ID in body
                }),
            });

            console.log('[DEBUG] Response status:', response.status);
            console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DEBUG] Error response text:', errorText);
                throw new Error(`Failed to add medical entry: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('[DEBUG] Medical entry added successfully:', result);
            
            // Close the add entry modal and clear selected patient
            setModalStates(prev => ({
                ...prev,
                showAddEntryModal: false
            }));
            
            // Important: Don't clear selectedPatient immediately if we're refreshing medical folder
            const currentSelectedPatient = selectedPatient;
            
            // Refresh medical folder data if modal is open
            if (modalStates.showMedicalFolderModal && currentSelectedPatient) {
                console.log('[DEBUG] Refreshing medical folder for patient:', currentSelectedPatient.id);
                await fetchMedicalFolderData(currentSelectedPatient.id);
            }
            
            // Clear selected patient after refresh
            setSelectedPatient(null);
            
            alert('Medical entry added successfully!');
            
        } catch (error) {
            console.error('[DEBUG] Error adding medical folder entry:', error);
            console.error('[DEBUG] Error stack:', error.stack);
            alert(`Error adding medical entry: ${error.message}`);
        }
    };

    const fetchMedicalFolderData = async (patientId) => {
        try {
            console.log('[DEBUG] Fetching medical folder for patient ID:', patientId);
            
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error('[DEBUG] No access token found');
                setMedicalFolderData([]);
                return;
            }

            const response = await fetch(`http://localhost:8000/account/medical-folder/${patientId}/`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[DEBUG] Medical folder fetch response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[DEBUG] Fetched medical folder raw data:', data);
                
                // Handle different response formats from backend
                let medicalEntries = [];
                if (Array.isArray(data)) {
                    medicalEntries = data;
                } else if (data.medical_entries && Array.isArray(data.medical_entries)) {
                    medicalEntries = data.medical_entries;
                } else if (data.results && Array.isArray(data.results)) {
                    medicalEntries = data.results;
                } else {
                    console.warn('[DEBUG] Unexpected medical folder data format:', data);
                    medicalEntries = [];
                }
                
                console.log('[DEBUG] Processed medical entries:', medicalEntries);
                setMedicalFolderData(medicalEntries);
            } else {
                const errorText = await response.text();
                console.error('[DEBUG] Failed to fetch medical folder data:', response.status, errorText);
                
                // If it's a 404, it might mean the patient has no medical folder yet
                if (response.status === 404) {
                    console.log('[DEBUG] Patient has no medical folder yet (404), setting empty array');
                    setMedicalFolderData([]);
                } else {
                    console.error('[DEBUG] Other error fetching medical folder data');
                    setMedicalFolderData([]);
                }
            }
        } catch (error) {
            console.error('[DEBUG] Error fetching medical folder data:', error);
            setMedicalFolderData([]);
        }
    };

    const handleShowMedicalFolder = async (patient) => {
        setSelectedPatient(patient);
        setModalStates(prev => ({ ...prev, showMedicalFolderModal: true }));
        await fetchMedicalFolderData(patient.id);
    };

    // Fix header button to require patient selection
    const handleHeaderAddEntry = () => {
        if (patients.length === 0) {
            alert('No patients available. Please add patients first.');
            return;
        }
        
        if (patients.length === 1) {
            // Auto-select the only patient
            handleAddEntry(patients[0]);
        } else {
            // Show patient selection dialog or use first patient as default
            alert('Please select a patient from the list below to add a medical entry.');
        }
    };

    const renderAddEntryModal = () => {
        if (!modalStates.showAddEntryModal || !selectedPatient) return null;

        return (
            <AddEntryForm
                patient={selectedPatient}
                services={services}
                onSubmit={handleAddMedicalFolderEntry}
                onCancel={() => {
                    setModalStates(prev => ({
                        ...prev,
                        showAddEntryModal: false
                    }));
                    setSelectedPatient(null);
                }}
            />
        );
    };

    const renderMedicalFolderModal = () => {
        if (!modalStates.showMedicalFolderModal || !selectedPatient) return null;

        return (
            <MedicalFolderModal
                patient={selectedPatient}
                medicalData={medicalFolderData}
                onClose={() => {
                    setModalStates(prev => ({
                        ...prev,
                        showMedicalFolderModal: false
                    }));
                    setSelectedPatient(null);
                    setMedicalFolderData([]);
                }}
                onAddEntry={() => {
                    setModalStates(prev => ({
                        ...prev,
                        showMedicalFolderModal: false,
                        showAddEntryModal: true
                    }));
                }}
            />
        );
    };

    if (loading) {
        return (
            <BaseLayout>
                <div className="patients-page">
                    <div className="loading-center">
                        <SpinnerOnly size="large" />
                    </div>
                </div>
            </BaseLayout>
        );
    }

    return (
        <BaseLayout>
            <div className="patients-page">
                {/* Fixed Header */}
                <div className="page-header">
                    <h1>{patientTranslations('title')}</h1>
                    <button 
                        className="btn btn-primary"
                        style={{ backgroundColor: '#22C7EE', borderColor: '#22C7EE' }}
                        onClick={handleHeaderAddEntry}
                        disabled={patients.length === 0}
                    >
                        <i className="bi bi-plus-circle me-1"></i> {patientTranslations('addMedicalEntry')}
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="patients-container">
                    {error && <div className="error-message">{error}</div>}
                    
                    {/* Patients List */}
                    <div className="patients-list">
                        {patients.length === 0 ? (
                            <div className="text-center p-5 bg-light rounded-3 my-4">
                                <p className="fs-5 mb-3">{patientTranslations('noPatientsFound')}</p>
                                <p className="text-muted">{patientTranslations('addPatientsFirst') || 'Please add patients before creating medical entries.'}</p>
                            </div>
                        ) : (
                            patients.map(patient => (
                                <div key={patient.id} className="card mb-3 shadow-sm">
                                    <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-3 pb-1">
                                        <h5 className="card-title mb-0">{patient.user.firstname} {patient.user.lastname}</h5>
                                    </div>
                                    <div className="card-body pt-2 bg-white">
                                        <div className="row mb-2">
                                            <div className="col-md-6">
                                                <p className="mb-1"><strong>{patientTranslations('email')}:</strong> {patient.user.email}</p>
                                                <p className="mb-1"><strong>{patientTranslations('phone')}:</strong> {patient.phone_number || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <p className="mb-1"><strong>{patientTranslations('birthdate')}:</strong> {patient.birth_date || 'N/A'}</p>
                                                <p className="mb-1"><strong>{patientTranslations('gender')}:</strong> {patient.gender || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                                        <div className="text-muted">
                                            <small className="me-2">{patientTranslations('created')}: {new Date(patient.created_at).toLocaleDateString()}</small>
                                        </div>
                                        <div>
                                            <button 
                                                className="btn btn-sm btn-outline-primary me-2"
                                                style={{ borderColor: '#22C7EE', color: '#22C7EE' }}
                                                onClick={() => handleAddEntry(patient)}
                                            >
                                                Add Medical Entry
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ borderColor: '#22C7EE', color: '#22C7EE' }}
                                                onClick={() => handleShowMedicalFolder(patient)}
                                            >
                                                {patientTranslations('viewMedicalFolder')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Add Entry Modal */}
                    {renderAddEntryModal()}
                    
                    {/* Medical Folder Modal */}
                    {renderMedicalFolderModal()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default PatientsPageNew;