import React from 'react';

const MedicalFolderModal = ({ patient, medicalData, onClose, onAddEntry }) => {
    console.log('[DEBUG] MedicalFolderModal rendered with:', {
        patient: patient,
        medicalDataLength: medicalData?.length,
        medicalData: medicalData
    });

    if (!patient) {
        return (
            <div className="modal-overlay">
                <div className="modal-dialog modal-lg">
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
        patientName = `${patient.user.firstname} ${patient.user.lastname}`;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Medical Folder - {patientName}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {/* Debug Info */}
                        <div className="alert alert-info mb-3">
                            <small>
                                <strong>Debug:</strong> Patient ID: {patient.id}, 
                                Entries: {medicalData?.length || 0}
                            </small>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6>Medical Entries</h6>
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    console.log('[DEBUG] Add Entry button clicked for patient:', patient);
                                    onAddEntry();
                                }}
                            >
                                <i className="bi bi-plus"></i> Add Entry
                            </button>
                        </div>
                        
                        {!medicalData || medicalData.length === 0 ? (
                            <div className="text-center p-4">
                                <div className="mb-3">
                                    <i className="bi bi-folder-x" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                                </div>
                                <h5 className="text-muted">No Medical Entries</h5>
                                <p className="text-muted">This patient doesn't have any medical entries yet.</p>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        console.log('[DEBUG] Add First Entry button clicked for patient:', patient);
                                        onAddEntry();
                                    }}
                                >
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Add First Medical Entry
                                </button>
                            </div>
                        ) : (
                            <div className="medical-entries">
                                {medicalData.map((entry, index) => (
                                    <div key={entry.id || index} className="card mb-2">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between">
                                                <h6 className="card-title">{entry.illness || 'No illness specified'}</h6>
                                                <small className="text-muted">{entry.date || 'No date'}</small>
                                            </div>
                                            <p className="card-text">{entry.notes || 'No notes'}</p>
                                            {entry.service && (
                                                <small className="text-info">Service: {entry.service}</small>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
};

export default MedicalFolderModal;
