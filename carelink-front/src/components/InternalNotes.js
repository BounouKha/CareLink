import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { internalNotesService } from '../services/internalNotesService';
import './InternalNotes.css';

const InternalNotes = ({ patientId, services, userRole, onClose, onNotesCountChange, triggerAdd }) => {
    const { t } = useTranslation();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [newNote, setNewNote] = useState({
        note: '',
        service_id: '',
        is_critical: false
    });    useEffect(() => {
        fetchInternalNotes();
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
    }, [triggerAdd]);const fetchInternalNotes = async () => {
        try {
            setLoading(true);
            const data = await internalNotesService.getInternalNotes(patientId);
            
            // Ensure data is an array
            if (Array.isArray(data)) {
                setNotes(data);
            } else {
                console.warn('Internal notes data is not an array:', data);
                setNotes([]);
            }
            setError('');
        } catch (err) {
            console.error('Error fetching internal notes:', err);
            setError(t('internalNotes.failedToLoadInternalNotes'));
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!newNote.note.trim()) {
            setError(t('internalNotes.noteContentRequired'));
            return;
        }

        try {
            if (editingNote) {
                await internalNotesService.updateInternalNote(patientId, editingNote.id, newNote);
            } else {
                await internalNotesService.createInternalNote(patientId, newNote);
            }
            
            // Reset form and refresh notes
            resetForm();
            await fetchInternalNotes();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setNewNote({
            note: note.note,
            service_id: note.service?.id || '',
            is_critical: note.is_critical
        });
        setShowAddForm(true);
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm(t('internalNotes.confirmDeleteNote'))) {
            return;
        }

        try {
            await internalNotesService.deleteInternalNote(patientId, noteId);
            await fetchInternalNotes();
        } catch (err) {
            setError(err.message);
        }
    };

    const resetForm = () => {
        setNewNote({
            note: '',
            service_id: '',
            is_critical: false
        });
        setEditingNote(null);
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

    // Check if user can add/edit internal notes
    const canManageNotes = ['Coordinator', 'Provider', 'Administrative', 'Social Assistant', 'Administrator'].includes(userRole);

    if (loading) {
        return (
            <div className="internal-notes-container">
                <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{t('common.loading')}</span>
                    </div>
                    <p className="mt-2">{t('internalNotes.loadingInternalNotes')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="internal-notes-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">
                    <i className="fas fa-shield-alt me-2 text-warning"></i>
                    {t('internalNotes.internalNotes')}
                    <small className="text-muted ms-2">{t('internalNotes.staffOnly')}</small>
                </h5>
                {canManageNotes && (
                    <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => setShowAddForm(true)}
                    >
                        <i className="fas fa-plus me-1"></i>
                        {t('internalNotes.addInternalNote')}
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

            {/* Add/Edit Form */}
            {showAddForm && canManageNotes && (
                <div className="card mb-4 border-warning">
                    <div className="card-header bg-warning bg-opacity-10">
                        <h6 className="mb-0">
                            <i className="fas fa-edit me-2"></i>
                            {editingNote ? t('internalNotes.editInternalNote') : t('internalNotes.addNewInternalNote')}
                        </h6>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-8">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-sticky-note me-2"></i>
                                            {t('internalNotes.noteContent')} *
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={newNote.note}
                                            onChange={(e) => setNewNote({...newNote, note: e.target.value})}
                                            placeholder={t('internalNotes.enterInternalNoteContent')}
                                            required
                                            maxLength="2000"
                                        />
                                        <div className="form-text">
                                            {newNote.note.length}/2000 {t('internalNotes.charactersLimit')}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-cog me-2"></i>
                                            {t('internalNotes.serviceOptional')}
                                        </label>
                                        <select
                                            className="form-select"
                                            value={newNote.service_id}
                                            onChange={(e) => setNewNote({...newNote, service_id: e.target.value})}
                                        >
                                            <option value="">{t('internalNotes.selectService')}</option>
                                            {services.map(service => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="criticalNote"
                                                checked={newNote.is_critical}
                                                onChange={(e) => setNewNote({...newNote, is_critical: e.target.checked})}
                                            />
                                            <label className="form-check-label" htmlFor="criticalNote">
                                                <i className="fas fa-exclamation-triangle text-danger me-1"></i>
                                                {t('internalNotes.criticalUrgentNote')}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-warning">
                                    <i className="fas fa-save me-2"></i>
                                    {editingNote ? t('internalNotes.updateNote') : t('internalNotes.saveNote')}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary"
                                    onClick={resetForm}
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}            {/* Notes List */}
            {!Array.isArray(notes) || notes.length === 0 ? (
                <div className="text-center p-5">
                    <div className="mb-3">
                        <i className="fas fa-shield-alt text-muted" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h6 className="text-muted">{t('internalNotes.noInternalNotes')}</h6>
                    <p className="text-muted">
                        {canManageNotes 
                            ? t('internalNotes.noInternalNotesManage')
                            : t('internalNotes.noInternalNotesView')
                        }
                    </p>
                </div>            ) : (
                <div className="internal-notes-list">
                    {Array.isArray(notes) && notes.map((note) => (
                        <div 
                            key={note.id} 
                            className={`card mb- ${note.is_critical ? 'border-danger' : ''}`}
                        >
                            <div className="card-header bg-light d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="d-flex align-items-center">
                                        <i className="fas fa-user-tie me-2 text-muted"></i>
                                        <strong>{note.created_by?.name || t('placeholders.unknownUser')}</strong>
                                        {note.is_critical && (
                                            <span className="badge bg-danger ms-2">
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                {t('internalNotes.critical')}
                                            </span>
                                        )}
                                    </div>
                                    <small className="text-muted">
                                        <i className="fas fa-clock me-2"></i>
                                        {formatDateTime(note.created_at)}
                                        {note.updated_at !== note.created_at && (
                                            <span className="ms-2">
                                                ({t('internalNotes.updated')}: {formatDateTime(note.updated_at)})
                                            </span>
                                        )}
                                    </small>
                                </div>
                                {canManageNotes && (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() => handleEdit(note)}
                                        >✏️
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className="btn btn-outline-danger bg-danger text-white"
                                            onClick={() => handleDelete(note.id)}
                                        >🗑️
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="card-body">
                                <p className="card-text">{note.note}</p>
                                {note.service && (
                                    <div className="mt-2">
                                        <span className="badge bg-info text-dark">
                                            <i className="fas fa-cog me-1"></i>
                                            {t('internalNotes.service')}: {note.service.name || note.service}
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

export default InternalNotes;
