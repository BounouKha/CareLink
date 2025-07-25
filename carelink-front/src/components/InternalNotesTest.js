import React, { useState, useEffect } from 'react';
import { internalNotesService } from '../services/internalNotesService';

const InternalNotesTest = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [patientId, setPatientId] = useState('1'); // Default test patient ID
    const [userRole, setUserRole] = useState('coordinator'); // Default role
    
    const [newNote, setNewNote] = useState({
        note: '',
        service_id: '',
        is_critical: false
    });

    const fetchNotes = async () => {
        if (!patientId) return;
        
        setLoading(true);
        try {
            const result = await internalNotesService.getInternalNotes(patientId);
            setNotes(result);
            setError('');
        } catch (err) {
            setError(err.message);
            setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async (e) => {
        e.preventDefault();
        if (!newNote.note.trim()) {
            setError('Note content is required');
            return;
        }

        try {
            await internalNotesService.createInternalNote(patientId, newNote);
            setNewNote({ note: '', service_id: '', is_critical: false });
            await fetchNotes();
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [patientId]);

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Internal Notes API Test</h2>
            
            {/* Test Controls */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <h3>Test Controls</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <label>
                        Patient ID:
                        <input 
                            type="number" 
                            value={patientId} 
                            onChange={(e) => setPatientId(e.target.value)}
                            style={{ marginLeft: '5px', padding: '5px' }}
                        />
                    </label>
                    <label>
                        User Role:
                        <select 
                            value={userRole} 
                            onChange={(e) => setUserRole(e.target.value)}
                            style={{ marginLeft: '5px', padding: '5px' }}
                        >
                            <option value="coordinator">Coordinator</option>
                            <option value="provider">Provider</option>
                            <option value="administrative">Administrative</option>
                            <option value="social_assistant">Social Assistant</option>
                            <option value="administrator">Administrator</option>
                            <option value="patient">Patient (should not see)</option>
                            <option value="family_patient">Family Patient (should not see)</option>
                        </select>
                    </label>
                </div>
                <button onClick={fetchNotes} style={{ padding: '5px 10px' }}>
                    Refresh Notes
                </button>
            </div>

            {/* Add Note Form */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h3>Add Internal Note</h3>
                <form onSubmit={handleCreateNote}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>
                            Note Content:
                            <textarea
                                value={newNote.note}
                                onChange={(e) => setNewNote({...newNote, note: e.target.value})}
                                rows="3"
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                placeholder="Enter internal note content..."
                            />
                        </label>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={newNote.is_critical}
                                onChange={(e) => setNewNote({...newNote, is_critical: e.target.checked})}
                                style={{ marginRight: '5px' }}
                            />
                            Critical/Urgent Note
                        </label>
                    </div>
                    <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}>
                        Add Internal Note
                    </button>
                </form>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '5px', marginBottom: '20px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Loading */}
            {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}

            {/* Notes Display */}
            <div>
                <h3>Internal Notes ({notes.length})</h3>
                {notes.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No internal notes found for this patient.</p>
                ) : (
                    <div>
                        {notes.map((note, index) => (
                            <div key={note.id || index} style={{ 
                                border: note.is_critical ? '2px solid #dc3545' : '1px solid #ddd', 
                                borderRadius: '5px', 
                                padding: '15px', 
                                marginBottom: '10px',
                                backgroundColor: note.is_critical ? '#fff5f5' : 'white'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                                    <div>
                                        <strong>{note.created_by}</strong>
                                        {note.is_critical && (
                                            <span style={{ 
                                                backgroundColor: '#dc3545', 
                                                color: 'white', 
                                                padding: '2px 6px', 
                                                borderRadius: '3px', 
                                                fontSize: '0.8em', 
                                                marginLeft: '10px' 
                                            }}>
                                                CRITICAL
                                            </span>
                                        )}
                                    </div>
                                    <small style={{ color: '#666' }}>
                                        {new Date(note.created_at).toLocaleString()}
                                    </small>
                                </div>
                                <p style={{ margin: '0 0 10px 0' }}>{note.note}</p>
                                {note.service && (
                                    <small style={{ color: '#007bff' }}>Service: {note.service}</small>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* API Info */}
            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                <h4>API Test Information</h4>
                <p><strong>Current Patient ID:</strong> {patientId}</p>
                <p><strong>Simulated User Role:</strong> {userRole}</p>
                <p><strong>API Endpoint:</strong> /account/internal_notes/{patientId}/</p>
                <p><strong>Can view internal notes:</strong> {['coordinator', 'provider', 'administrative', 'social_assistant', 'administrator'].includes(userRole) ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
};

export default InternalNotesTest;
