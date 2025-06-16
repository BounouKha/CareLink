import React, { useState, useEffect } from 'react';
import InternalNotes from '../../components/InternalNotes';
import MedicalNotes from '../../components/MedicalNotes';
import { useSecureRole } from '../../hooks/useSecureRole';
import { internalNotesService } from '../../services/internalNotesService';
import './MedicalFolderEnhanced.css';

const MedicalFolderEnhanced = ({ patient, medicalData, onClose, onAddEntry, services, internalNotesCount: initialInternalCount, onInternalNotesUpdate }) => {
    const [activeTab, setActiveTab] = useState('medical');
    const [internalNotesCount, setInternalNotesCount] = useState(initialInternalCount || 0);
    const [medicalNotesCount, setMedicalNotesCount] = useState(0);
    const [triggerInternalAdd, setTriggerInternalAdd] = useState(false);
    const [triggerMedicalAdd, setTriggerMedicalAdd] = useState(false);
    
    // Use secure server-side role validation
    const { userRole, isLoading: roleLoading, error: roleError, canViewInternalNotes } = useSecureRole();

    // Fetch internal notes count when component mounts
    useEffect(() => {
        const fetchInternalCount = async () => {
            if (patient && patient.id && canViewInternalNotes) {
                try {
                    console.log('[DEBUG] Fetching internal notes count for patient:', patient.id);
                    const count = await internalNotesService.getInternalNotesCount(patient.id);
                    console.log('[DEBUG] Got internal notes count:', count);
                    setInternalNotesCount(count);
                    
                    // Also update the parent component's count
                    if (onInternalNotesUpdate) {
                        onInternalNotesUpdate();
                    }
                } catch (error) {
                    console.error('[DEBUG] Error fetching internal notes count:', error);
                    setInternalNotesCount(0);
                }
            }
        };

        fetchInternalCount();
    }, [patient?.id, canViewInternalNotes, onInternalNotesUpdate]);

    // Update internal notes count when prop changes
    useEffect(() => {
        if (initialInternalCount !== undefined) {
            setInternalNotesCount(initialInternalCount);
        }
    }, [initialInternalCount]);

    console.log('[DEBUG] MedicalFolderEnhanced rendered with:', {
        patient: patient,
        medicalDataLength: medicalData?.length,
        userRole: userRole,
        services: services?.length,
        initialInternalCount: initialInternalCount,
        internalNotesCount: internalNotesCount,
        canViewInternalNotes: canViewInternalNotes
    });    // Reset triggers after tab becomes active
    useEffect(() => {
        if (activeTab === 'internal' && triggerInternalAdd) {
            // Reset trigger after a short delay to allow the InternalNotes component to process it
            const timer = setTimeout(() => {
                setTriggerInternalAdd(false);
            }, 200);
            return () => clearTimeout(timer);
        }
        
        if (activeTab === 'medical' && triggerMedicalAdd) {
            // Reset trigger after a short delay to allow the MedicalNotes component to process it
            const timer = setTimeout(() => {
                setTriggerMedicalAdd(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeTab, triggerInternalAdd, triggerMedicalAdd]);

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
                            Patient Records - {patientName}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-dark"
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="modal-body bg-white p-0">                        {/* Tabs Navigation */}
                        <div className="tabs-container">
                            <ul className="nav nav-tabs nav-fill border-bottom-0">
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'medical' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('medical')}
                                    >                                        <i className="fas fa-stethoscope me-2"></i>
                                        Medical Notes
                                        <span className="badge bg-primary ms-2">{medicalNotesCount}</span>
                                    </button>
                                </li>
                                {canViewInternalNotes && (
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${activeTab === 'internal' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('internal')}
                                        >
                                            <i className="fas fa-shield-alt me-2"></i>
                                            Internal Notes
                                            <span className="badge bg-warning text-dark ms-2">{internalNotesCount}</span>
                                            <small className="ms-1 text-muted">(Staff Only)</small>
                                        </button>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Tab Content */}
                        <div className="tab-content p-4">                            {/* Medical Notes Tab */}
                            {activeTab === 'medical' && (
                                <div className="tab-pane fade show active">
                                    <MedicalNotes 
                                        patientId={patient.id}
                                        services={services}
                                        userRole={userRole}
                                        onNotesCountChange={setMedicalNotesCount}
                                        triggerAdd={triggerMedicalAdd}
                                    />
                                </div>
                            )}{/* Internal Notes Tab */}
                            {activeTab === 'internal' && canViewInternalNotes && (
                                <div className="tab-pane fade show active">
                                    <InternalNotes 
                                        patientId={patient.id}
                                        services={services}
                                        userRole={userRole}
                                        onNotesCountChange={setInternalNotesCount}
                                        triggerAdd={triggerInternalAdd}
                                    />
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
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalFolderEnhanced;
