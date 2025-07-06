import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import InternalNotes from '../../components/InternalNotes';
import MedicalNotes from '../../components/MedicalNotes';
import { useSecureRole } from '../../hooks/useSecureRole';
import { internalNotesService } from '../../services/internalNotesService';
import { medicalNotesService } from '../../services/medicalNotesService';
import './MedicalFolderEnhanced.css';

const MedicalFolderEnhanced = ({ patient, medicalData, onClose, onAddEntry, services }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('medical');
    const [internalNotesCount, setInternalNotesCount] = useState(0);
    const [medicalNotesCount, setMedicalNotesCount] = useState(0);
    const [countsLoading, setCountsLoading] = useState(true);
    const [triggerInternalAdd, setTriggerInternalAdd] = useState(false);
    const [triggerMedicalAdd, setTriggerMedicalAdd] = useState(false);
    
    // Use secure server-side role validation
    const { userRole, isLoading: roleLoading, error: roleError, canViewInternalNotes } = useSecureRole();

    // Fetch counts when modal opens
    useEffect(() => {
        const fetchCounts = async () => {
            if (!patient?.id) return;
            
            setCountsLoading(true);
            try {
                // Fetch both counts in parallel
                const [medicalCount, internalCount] = await Promise.allSettled([
                    medicalNotesService.getMedicalNotesCount(patient.id),
                    canViewInternalNotes ? internalNotesService.getInternalNotesCount(patient.id) : Promise.resolve(0)
                ]);

                // Handle medical notes count
                if (medicalCount.status === 'fulfilled') {
                    setMedicalNotesCount(medicalCount.value || 0);
                } else {
                    console.error('Error fetching medical notes count:', medicalCount.reason);
                    setMedicalNotesCount(0);
                }

                // Handle internal notes count
                if (internalCount.status === 'fulfilled') {
                    setInternalNotesCount(internalCount.value || 0);
                } else {
                    console.error('Error fetching internal notes count:', internalCount.reason);
                    setInternalNotesCount(0);
                }
            } catch (error) {
                console.error('Error fetching counts:', error);
                setMedicalNotesCount(0);
                setInternalNotesCount(0);
            } finally {
                setCountsLoading(false);
            }
        };

        fetchCounts();
    }, [patient?.id, canViewInternalNotes]);

    // Update counts when notes are added/removed
    const handleInternalNotesCountChange = (newCount) => {
        setInternalNotesCount(newCount);
    };

    const handleMedicalNotesCountChange = (newCount) => {
        setMedicalNotesCount(newCount);
    };

    if (!patient) {
        return (
            <div className="modal-overlay">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Error</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-danger">
                                No patient data available.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Determine patient name
    let patientName = 'Unknown Patient';
    if (patient.firstname && patient.lastname) {
        patientName = `${patient.firstname} ${patient.lastname}`;
    } else if (patient.user && patient.user.firstname && patient.user.lastname) {
        patientName = `${patient.user.firstname} ${patient.user.lastname}`;    }    const handleAddNote = (noteType) => {
        if (noteType === 'medical') {
            // Switch to medical notes tab and trigger add form (inline behavior)
            setActiveTab('medical');
            setTriggerMedicalAdd(true);
        } else if (noteType === 'internal') {
            // Switch to internal notes tab and trigger add form
            setActiveTab('internal');
            setTriggerInternalAdd(true);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header border-bottom bg-white">
                        <h5 className="modal-title fw-semibold text-dark">
                            <i className="fas fa-folder-medical me-2 text-primary"></i>
                            {t('patients.patientRecords')} - {patientName}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-dark"
                            onClick={onClose}
                            aria-label={t('common.close')}
                        ></button>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="modal-body bg-white p-0">
                        {/* Tabs Navigation */}
                        <div className="tabs-container">
                            <ul className="nav nav-tabs nav-fill border-bottom-0">
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'medical' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('medical')}
                                    >
                                        <i className="fas fa-stethoscope me-2"></i>
                                        {t('medicalNotes.title')}
                                        {!countsLoading && (
                                            <span className="badge bg-primary ms-2">{medicalNotesCount}</span>
                                        )}
                                        {countsLoading && (
                                            <div className="spinner-border spinner-border-sm ms-2" role="status" style={{width: '12px', height: '12px'}}>
                                                <span className="visually-hidden">{t('common.loading')}</span>
                                            </div>
                                        )}
                                    </button>
                                </li>
                                {canViewInternalNotes && (
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${activeTab === 'internal' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('internal')}
                                        >
                                            <i className="fas fa-shield-alt me-2"></i>
                                            {t('internalNotes.title')}
                                            {!countsLoading && (
                                                <span className="badge bg-warning text-dark ms-2">{internalNotesCount}</span>
                                            )}
                                            {countsLoading && (
                                                <div className="spinner-border spinner-border-sm ms-2" role="status" style={{width: '12px', height: '12px'}}>
                                                    <span className="visually-hidden">{t('common.loading')}</span>
                                                </div>
                                            )}
                                            <small className="ms-1 text-muted">{t('internalNotes.staffOnly')}</small>
                                        </button>
                                    </li>
                                )}
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'doctor' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('doctor')}
                                    >
                                        <i className="fas fa-user-md me-2"></i>
                                        {t('patients.doctor')} ({t('patients.generalPractitioner')})
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Tab Content */}
                        <div className="tab-content p-4">
                            {/* Medical Notes Tab */}
                            {activeTab === 'medical' && (
                                <div className="tab-pane fade show active">
                                    <MedicalNotes 
                                        patientId={patient.id}
                                        services={services}
                                        userRole={userRole}
                                        onNotesCountChange={handleMedicalNotesCountChange}
                                        triggerAdd={triggerMedicalAdd}
                                    />
                                </div>
                            )}

                            {/* Internal Notes Tab */}
                            {activeTab === 'internal' && canViewInternalNotes && (
                                <div className="tab-pane fade show active">
                                    <InternalNotes 
                                        patientId={patient.id}
                                        services={services}
                                        userRole={userRole}
                                        onNotesCountChange={handleInternalNotesCountChange}
                                        triggerAdd={triggerInternalAdd}
                                    />
                                </div>
                            )}

                            {/* Doctor (GP) Tab */}
                            {activeTab === 'doctor' && (
                                <div className="tab-pane fade show active">
                                    <div className="doctor-info-container">
                                        <div className="row">
                                            <div className="col-12">
                                                <h4 className="mb-4">
                                                    <i className="fas fa-user-md me-2 text-primary"></i>
                                                    {t('patients.doctorInfo')}
                                                </h4>
                                                
                                                {patient.doctor_name ? (
                                                    <div className="card border-0 shadow-sm">
                                                        <div className="card-body">
                                                            <div className="row">
                                                                <div className="col-md-6">
                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="fas fa-user me-2"></i>
                                                                            {t('patients.doctorName')}
                                                                        </label>
                                                                        <p className="form-control-plaintext">{patient.doctor_name}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="fas fa-phone me-2"></i>
                                                                            {t('patients.doctorPhone')}
                                                                        </label>
                                                                        <p className="form-control-plaintext">
                                                                            {patient.doctor_phone ? (
                                                                                <a href={`tel:${patient.doctor_phone}`} className="text-decoration-none">
                                                                                    {patient.doctor_phone}
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-muted">Not provided</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="row">
                                                                <div className="col-md-6">
                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="fas fa-envelope me-2"></i>
                                                                            {t('patients.doctorEmail')}
                                                                        </label>
                                                                        <p className="form-control-plaintext">
                                                                            {patient.doctor_email ? (
                                                                                <a href={`mailto:${patient.doctor_email}`} className="text-decoration-none">
                                                                                    {patient.doctor_email}
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-muted">Not provided</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-semibold text-muted">
                                                                            <i className="fas fa-map-marker-alt me-2"></i>
                                                                            {t('patients.doctorAddress')}
                                                                        </label>
                                                                        <p className="form-control-plaintext">
                                                                            {patient.doctor_address ? (
                                                                                <span>{patient.doctor_address}</span>
                                                                            ) : (
                                                                                <span className="text-muted">Not provided</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-5">
                                                        <i className="fas fa-user-md text-muted mb-3" style={{fontSize: '3rem'}}></i>
                                                        <h5 className="text-muted">{t('patients.noDoctorInfo')}</h5>
                                                        <p className="text-muted">{t('patients.noDoctorInfoDescription')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="modal-footer border-top bg-white">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            <i className="fas fa-times me-2"></i>
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalFolderEnhanced;
