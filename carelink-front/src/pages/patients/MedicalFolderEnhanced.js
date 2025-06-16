import React, { useState, useEffect } from 'react';
import InternalNotes from '../../components/InternalNotes';
import { useSecureRole } from '../../hooks/useSecureRole';
import './MedicalFolderEnhanced.css';

const MedicalFolderEnhanced = ({ patient, medicalData, onClose, onAddEntry, services }) => {
    const [activeTab, setActiveTab] = useState('medical');
    const [internalNotesCount, setInternalNotesCount] = useState(0);
    const [triggerInternalAdd, setTriggerInternalAdd] = useState(false);
    
    // Use secure server-side role validation
    const { userRole, isLoading: roleLoading, error: roleError, canViewInternalNotes } = useSecureRole();    console.log('[DEBUG] MedicalFolderEnhanced rendered with:', {
        patient: patient,
        medicalDataLength: medicalData?.length,
        userRole: userRole,
        services: services?.length
    });

    // Reset the trigger after tab becomes active
    useEffect(() => {
        if (activeTab === 'internal' && triggerInternalAdd) {
            // Reset trigger after a short delay to allow the InternalNotes component to process it
            const timer = setTimeout(() => {
                setTriggerInternalAdd(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeTab, triggerInternalAdd]);

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
            onAddEntry();
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
                                    >
                                        <i className="fas fa-stethoscope me-2"></i>
                                        Medical Notes
                                        <span className="badge bg-primary ms-2">{medicalData?.length || 0}</span>
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
                        <div className="tab-content p-4">
                            {/* Medical Notes Tab */}
                            {activeTab === 'medical' && (                                <div className="tab-pane fade show active">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h6 className="mb-0">
                                            <i className="fas fa-notes-medical me-2 text-primary"></i>
                                            Medical Entries
                                        </h6>
                                    </div>
                                    
                                    {!medicalData || medicalData.length === 0 ? (                                        <div className="text-center p-5">
                                            <div className="mb-3">
                                                <i className="fas fa-notes-medical text-muted" style={{ fontSize: '3rem' }}></i>
                                            </div>
                                            <h6 className="text-muted">No Medical Entries</h6>
                                            <p className="text-muted">This patient doesn't have any medical entries yet. Use the "Add Note" button below to create the first entry.</p>
                                        </div>
                                    ) : (
                                        <div className="medical-entries">
                                            {medicalData.map((entry, index) => (
                                                <div key={entry.id || index} className="card mb-3">
                                                    <div className="card-header bg-light d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6 className="mb-1">
                                                                {entry.illness || 'Medical Entry'}
                                                            </h6>
                                                            <small className="text-muted">
                                                                <i className="fas fa-calendar me-1"></i>
                                                                {entry.date || new Date(entry.created_at).toLocaleDateString()}
                                                            </small>
                                                        </div>
                                                        {entry.service && (
                                                            <span className="badge bg-info text-dark">
                                                                {entry.service}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="card-body">
                                                        <p className="mb-0">{entry.notes || entry.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}                            {/* Internal Notes Tab */}
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
                        {/* Add Note Dropdown */}
                        <div className="btn-group me-2">
                            <button 
                                type="button" 
                                className="btn btn-success"
                                onClick={() => handleAddNote('medical')}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Add Note
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-success dropdown-toggle dropdown-toggle-split" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false"
                            >
                                <span className="visually-hidden">Toggle Dropdown</span>
                            </button>
                            <ul className="dropdown-menu">
                                <li>
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => handleAddNote('medical')}
                                    >
                                        <i className="fas fa-stethoscope me-2 text-primary"></i>
                                        Medical Note
                                        <small className="text-muted d-block">Visible to all authorized users</small>
                                    </button>
                                </li>
                                {canViewInternalNotes && (
                                    <li>
                                        <button 
                                            className="dropdown-item" 
                                            onClick={() => handleAddNote('internal')}
                                        >
                                            <i className="fas fa-shield-alt me-2 text-warning"></i>
                                            Internal Note
                                            <small className="text-muted d-block">Staff only - not visible to patients</small>
                                        </button>
                                    </li>
                                )}
                            </ul>
                        </div>
                        
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
