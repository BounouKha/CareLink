import React, { useState, useEffect } from 'react';
import { medicalNotesService } from '../services/medicalNotesService';
import { useCareTranslation } from '../hooks/useCareTranslation';
import './InternalNotes.css'; // Reuse the same CSS styling



                


const MedicalNotes = ({ patientId, services, userRole, onNotesCountChange, triggerAdd }) => {
    const { common, patients, placeholders, errors } = useCareTranslation();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNote, setNewNote] = useState({
        notes: '',
        service_id: ''
    });

            <button 
                        className="btn btn-warning btn-sm medical-note-add-btn"
                        onClick={() => setShowAddForm(true)}
                    >
                        <i className="fas fa-plus me-1"></i>
                        {patients('addEntry', { defaultValue: 'Add Medical Note' })}
            </button>

    useEffect(() => {
        fetchMedicalNotes();
    }, [patientId]);

    useEffect(() => {
        // Update notes count whenever notes change
        if (onNotesCountChange) {
            onNotesCountChange(notes.length);
        }
    }, [notes, onNotesCountChange]);

    useEffect(() => {
        // Handle external trigger to open add form
        if (triggerAdd) {
            setShowAddForm(true);
        }
    }, [triggerAdd]);

    const fetchMedicalNotes = async () => {
        try {
            setLoading(true);
            const data = await medicalNotesService.getMedicalNotes(patientId);
            
            // Ensure data is an array
            if (Array.isArray(data)) {
                setNotes(data);
            } else {
                console.warn('Medical notes data is not an array:', data);
                setNotes([]);
            }
            setError('');        } catch (err) {
            console.error('Error fetching medical notes:', err);
            setError(common('error', { defaultValue: 'Failed to load medical notes' }));
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
          if (!newNote.notes.trim()) {
            setError(errors('medicalNotesRequired', { defaultValue: 'Medical notes are required' }));
            return;
        }

        try {
            // Prepare the data to match backend expectations
            const noteData = {
                note: newNote.notes, // Backend expects 'note' field, not 'notes'
                service_id: newNote.service_id || null
            };

            await medicalNotesService.createMedicalNote(patientId, noteData);
            
            // Reset form and refresh notes
            resetForm();
            await fetchMedicalNotes();
        } catch (err) {
            setError(err.message);
        }
    };

    const resetForm = () => {
        setNewNote({
            notes: '',
            service_id: ''
        });
        setShowAddForm(false);
        setError('');
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Check if user can add medical notes
    const canManageNotes = ['Coordinator', 'Provider', 'Administrative', 'Social Assistant', 'Administrator'].includes(userRole);

    if (loading) {
        return (
            <div className="internal-notes-container">                <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{common('loading')}</span>
                    </div>
                    <p className="mt-2">{common('loading', { defaultValue: 'Loading medical notes...' })}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="internal-notes-container">
            <div className="d-flex justify-content-between align-items-center mb-4">                <h5 className="mb-0">
                    <i className="fas fa-notes-medical me-2 text-primary"></i>
                    {patients('medicalFolder', { defaultValue: 'Medical Entries' })}
                </h5>
                {canManageNotes && (                    <button 
                        className="btn btn-warning btn-sm medical-note-add-btn"
                        onClick={() => setShowAddForm(true)}
                    >
                        <i className="fas fa-plus me-1"></i>
                        {patients('addEntry', { defaultValue: 'Add Medical Note' })}
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button 
                        type="button" 
                        className="btn-close" 
                        onClick={() => setError('')}
                    ></button>
                </div>
            )}

            {/* Add Form */}
            {showAddForm && canManageNotes && (
                <div className="card mb-4 border-primary">
                    <div className="card-header bg-primary bg-opacity-10">                        <h6 className="mb-0">
                            <i className="fas fa-edit me-2"></i>
                            {patients('addNewEntry', { defaultValue: 'Add New Medical Note' })}
                        </h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-8">
                                    <div className="mb-3">                                        <label className="form-label">
                                            <i className="fas fa-sticky-note me-2"></i>
                                            {patients('medicalNotes', { defaultValue: 'Medical Notes' })} *
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={newNote.notes}
                                            onChange={(e) => setNewNote({...newNote, notes: e.target.value})}
                                            placeholder={placeholders('enterDetailedMedicalNotes', { defaultValue: 'Enter detailed medical notes' })}
                                            required
                                            maxLength="2000"
                                        />                                        <div className="form-text">
                                            {common('charactersCount', { defaultValue: '{count}/2000 characters', count: newNote.notes.length })}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">                                        <label className="form-label">
                                            <i className="fas fa-cog me-2"></i>
                                            {common('service', { defaultValue: 'Service' })} ({common('optional', { defaultValue: 'Optional' })})
                                        </label>
                                        <select
                                            className="form-select"
                                            value={newNote.service_id}
                                            onChange={(e) => setNewNote({...newNote, service_id: e.target.value})}
                                        >
                                            <option value="">{placeholders('selectService', { defaultValue: 'Select Service' })}</option>
                                            {services && services.map(service => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2">                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-save me-2"></i>
                                    {common('save', { defaultValue: 'Save Note' })}
                                </button>                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary"
                                    onClick={resetForm}
                                >
                                    {common('cancel', { defaultValue: 'Cancel' })}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notes List */}
            {!Array.isArray(notes) || notes.length === 0 ? (
                <div className="text-center p-5">
                    <div className="mb-3">
                        <i className="fas fa-notes-medical text-muted" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h6 className="text-muted">{patients('noMedicalEntries', { defaultValue: 'No Medical Entries' })}</h6>                    <p className="text-muted">
                        {canManageNotes 
                            ? patients('noMedicalEntriesManage', { defaultValue: 'No medical entries have been created for this patient yet. Add the first entry using the button above.' })
                            : patients('noMedicalEntriesView', { defaultValue: 'No medical entries are available for this patient.' })
                        }
                    </p>
                </div>
            ) : (
                <div className="internal-notes-list">
                    {Array.isArray(notes) && notes.map((note) => (
                        <div 
                            key={note.id} 
                            className="card mb-3"
                        >
                            <div className="card-header bg-light">
                                <div>
                                    <div className="d-flex align-items-center">
                                        <i className="fas fa-user-md me-2 text-muted"></i>                                        <strong>
                                            {patients('medicalEntry', { defaultValue: 'Medical Entry' })}
                                            {note.created_by && (
                                                <span className="text-muted fw-normal ms-2">
                                                    {common('by', { defaultValue: 'by' })} {note.created_by.firstname} {note.created_by.lastname}
                                                </span>
                                            )}
                                        </strong>
                                    </div>
                                    <small className="text-muted">
                                        <i className="fas fa-clock me-1"></i>
                                        {formatDateTime(note.created_at)}                                        {note.updated_at && note.updated_at !== note.created_at && (
                                            <span className="ms-2">
                                                ({common('updated', { defaultValue: 'Updated' })}: {formatDateTime(note.updated_at)})
                                            </span>
                                        )}
                                    </small>
                                </div>
                            </div>
                            <div className="card-body">
                                <p className="card-text">{note.note}</p>
                                {note.service && (
                                    <div className="mt-2">                                        <span className="badge bg-info text-dark">
                                            <i className="fas fa-cog me-1"></i>
                                            {common('service', { defaultValue: 'Service' })}: {typeof note.service === 'string' ? note.service : note.service.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MedicalNotes;
