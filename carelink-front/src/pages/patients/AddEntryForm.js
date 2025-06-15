import React, { useState, useCallback } from 'react';

const AddEntryForm = ({ patient, services, onSubmit, onCancel }) => {
    const [selectedService, setSelectedService] = useState('');
    const [illness, setIllness] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleServiceChange = useCallback((e) => {
        const serviceId = e.target.value;
        setSelectedService(serviceId);
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        
        if (!patient || !patient.id) {
            alert('Error: No patient selected. Please try again.');
            return;
        }

        if (!illness.trim() || !notes.trim()) {
            alert('Please fill in all required fields (illness and notes)');
            return;
        }

        const entryData = {
            patient_id: patient.id,
            service_id: selectedService || null,
            illness: illness.trim(),
            notes: notes.trim(),
            date: date
        };

        onSubmit(entryData);
    }, [patient, selectedService, illness, notes, date, onSubmit]);

    if (!patient) {
        return (
            <div className="modal-overlay">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Error</h5>
                            <button type="button" className="btn-close" onClick={onCancel}></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-danger">
                                <p>No patient selected. Please select a patient first.</p>
                                <p><strong>Debug Info:</strong> Patient prop is {typeof patient}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Determine patient name - handle different patient object structures
    let patientName = 'Unknown Patient';
    if (patient.firstname && patient.lastname) {
        patientName = `${patient.firstname} ${patient.lastname}`;
    } else if (patient.user && patient.user.firstname && patient.user.lastname) {
        patientName = `${patient.user.firstname} ${patient.user.lastname}`;
    } else if (patient.name) {
        patientName = patient.name;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Add Medical Entry</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {/* Debug Info */}
                            <div className="alert alert-info mb-3">
                                <small>
                                    <strong>Debug:</strong> Patient ID: {patient.id}, 
                                    Name: {patientName}
                                </small>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Patient</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={patientName}
                                    disabled 
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Service (Optional)</label>
                                <select
                                    className="form-select"
                                    value={selectedService}
                                    onChange={handleServiceChange}
                                >
                                    <option value="">Select a service...</option>
                                    {Array.isArray(services) && services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Illness/Condition *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={illness}
                                    onChange={(e) => setIllness(e.target.value)}
                                    placeholder="Enter illness or medical condition"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Notes *</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter detailed notes"
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Add Entry
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddEntryForm;
