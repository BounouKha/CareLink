import React, { useEffect, useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from '../../auth/layout/BaseLayout';
import MedicalFolderEnhanced from '../patients/MedicalFolderEnhanced';
import { medicalNotesService } from '../../services/medicalNotesService'; // Import medical notes service
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';
import { useCareTranslation } from '../../hooks/useTranslation';
// Import page-specific CSS for components not covered by unified styles
import './PatientsPage.css';

const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMedicalFolderModal, setShowMedicalFolderModal] = useState(false);
    const [showEditPatientModal, setShowEditPatientModal] = useState(false);
    const [medicalFolderCounts, setMedicalFolderCounts] = useState({}); // Store counts when modal opens

    // Use modern authentication API
    const { get, put, post, delete: del } = useAuthenticatedApi();

    // Import translation hooks
    const { patients: patientsT, common, placeholders, errors, success } = useCareTranslation();

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                if (!tokenManager.isAuthenticated()) {
                    throw new Error('User not authenticated. Please log in.');
                }
                
                const data = await get('http://localhost:8000/account/views_patient/');
                console.log('[DEBUG] Fetched patient data:', data);
                setPatients(data.results);
            } catch (err) {
                console.error('[DEBUG] Error fetching patients:', err);
                setError(err.message);
                if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                    tokenManager.handleLogout();
                }
            }
        };

        fetchPatients();
    }, [get]);

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
    };    const refetchPatients = async () => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            const data = await get('http://localhost:8000/account/views_patient/');
            setPatients(data.results);
        } catch (err) {
            console.error('[DEBUG] Error refetching patients:', err);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            }
        }
    };    const handleSaveChanges = async () => {
        try {
            if (!tokenManager.isAuthenticated()) {
                throw new Error('User not authenticated. Please log in.');
            }

            await put(`http://localhost:8000/account/update_patient/${selectedPatient.id}/`, selectedPatient);

            // Refetch the patient list after saving changes
            await refetchPatients();

            handleCloseModal();
        } catch (err) {
            console.error('[DEBUG] Error updating patient:', err);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                tokenManager.handleLogout();
            } else {
                alert('Failed to save changes. Please try again.');
            }
        }    };

    const handleShowMedicalFolder = (patient) => {
        console.log('[DEBUG] handleShowMedicalFolder called with patient:', patient);
        console.log('[DEBUG] Medical Folder button clicked for patient:', patient.id);
        setSelectedPatient(patient);
        setShowMedicalFolderModal(true);
        console.log('[DEBUG] setShowMedicalFolderModal(true) called');
    };

    const handleCloseMedicalFolderModal = () => {
        setShowMedicalFolderModal(false);
        setSelectedPatient(null);
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.firstname} ${patient.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.national_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.birth_date?.toLowerCase().includes(searchTerm.toLowerCase())
    );    return (
        <>
            <BaseLayout>
                <div className="page-container">
                    <div className="content-container">
                        {/* Page Header */}
                        <div className="page-header mb-4">
                            <h1 className="page-title">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="me-3">
                                    <path d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7ZM20 8V14M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Patients Management
                            </h1>
                            <p className="page-subtitle">Manage patient information and medical records</p>
                        </div>

                        {/* Search Bar with Stats */}
                        <div className="search-section">
                            <div className="search-input-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="search-icon">
                                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search patients by name, ID, or birth date..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="form-control search-input"
                                />
                            </div>
                            <div className="patients-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{filteredPatients.length}</span>
                                    <span className="stat-label">
                                        {filteredPatients.length === 1 ? 'Patient' : 'Patients'} Found
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{patients.length}</span>
                                    <span className="stat-label">Total Patients</span>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="me-2">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                {error}
                            </div>
                        )}
                        
                        {/* Patient List */}
                        {filteredPatients.length > 0 ? (
                            <div className="patients-list">
                                {filteredPatients.filter(patient => patient.firstname && patient.lastname).map((patient, index) => (
                                    <div key={index} className="patient-item">
                                        <div className="patient-info">
                                            <div className="patient-header">
                                                <div className="patient-avatar">
                                                    {patient.firstname.charAt(0)}{patient.lastname.charAt(0)}
                                                </div>
                                                <div className="patient-main-info">
                                                    <h3 className="patient-name">{patient.firstname} {patient.lastname}</h3>
                                                    <span className="patient-id">ID: {patient.national_number}</span>
                                                </div>
                                            </div>
                                            <div className="patient-details">
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                                                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                                                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        {patientsT('birthDate')}
                                                    </div>
                                                    <div className="patient-detail-value">{patient.birth_date}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        {patientsT('gender')}
                                                    </div>
                                                    <div className="patient-detail-value">{patient.gender || 'N/A'}</div>
                                                </div>
                                                <div className="patient-detail-item">
                                                    <div className="patient-detail-label">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <path d="M7 3V21L12 18L17 21V3H7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                        {patientsT('bloodType')}
                                                    </div>
                                                    <div className="patient-detail-value">{patient.blood_type || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="patient-actions">
                                            <button 
                                                className="btn-sm btn-info" 
                                                onClick={() => handleShowDetails(patient)}
                                                title="View and edit patient information"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                            <button 
                                                className="btn-sm btn-warning position-relative" 
                                                onClick={() => handleShowMedicalFolder(patient)}
                                                title="View medical history and records"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                {/* Simple indicator that medical folder exists - no count fetching */}
                                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info" style={{fontSize: '0.5rem', minWidth: '0.8rem', height: '0.8rem'}}>
                                                    <i className="fas fa-file-medical" style={{fontSize: '0.4rem'}}></i>
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-patients">
                                <div className="no-patients-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                        <path d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21M20.5 11.5L22 13L20.5 14.5M18 13H22M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3>No patients found</h3>
                                <p>
                                    {searchTerm 
                                        ? `No patients match your search "${searchTerm}"` 
                                        : 'No patients have been added to the system yet'
                                    }
                                </p>
                                {searchTerm && (
                                    <button 
                                        className="btn btn-outline-primary"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        Clear Search
                                    </button>
                                )}
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
                                        {patientsT('nationalNumber')}:
                                        <input
                                            type="text"
                                            value={selectedPatient.national_number}
                                            disabled
                                        />
                                    </label>
                                    <label>
                                        {patientsT('birthDate')}:
                                        <input
                                            type="date"
                                            value={selectedPatient.birth_date}
                                            disabled
                                        />
                                    </label>
                                    <label>
                                        {patientsT('gender')}:
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
                                        {patientsT('bloodType')}:
                                        <input
                                            type="text"
                                            value={selectedPatient.blood_type}
                                            onChange={(e) => handleInputChange('blood_type', e.target.value)}
                                        />
                                    </label>
                                    <label>
                                        {patientsT('emergencyContact')}:
                                        <input
                                            type="text"
                                            value={selectedPatient.emergency_contact}
                                            onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                                        />
                                    </label>
                                </div>
                                <label>
                                    {patientsT('illness')}:
                                    <input
                                        type="text"
                                        value={selectedPatient.illness}
                                        onChange={(e) => handleInputChange('illness', e.target.value)}
                                    />
                                </label>
                                <label>
                                    {patientsT('criticalInformation')}:
                                    <input
                                        type="text"
                                        value={selectedPatient.critical_information}
                                        onChange={(e) => handleInputChange('critical_information', e.target.value)}
                                    />
                                </label>
                                <label>
                                    {patientsT('medication')}:
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
                                        {patientsT('socialPriceEligible')}:
                                        <input
                                            type="checkbox"
                                            checked={selectedPatient.social_price}
                                            onChange={(e) => handleInputChange('social_price', e.target.checked)}
                                        />
                                    </label>
                                    <label>
                                        {patientsT('activePatient')}:
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
            )}            {/* Medical Folder Modal - Enhanced with Internal Notes */}
            {showMedicalFolderModal && selectedPatient && (
                <MedicalFolderEnhanced
                    patient={selectedPatient}
                    isOpen={showMedicalFolderModal}
                    onClose={handleCloseMedicalFolderModal}
                />
            )}
        </>
    );
};

export default PatientsPage;
