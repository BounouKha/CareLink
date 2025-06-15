import React, { useState, useEffect } from 'react';

const MedicalFolder = ({ patientId, userData, userRole }) => {
    const [medicalData, setMedicalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newEntry, setNewEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        illness: '',
        notes: ''
    });
    const [showAddForm, setShowAddForm] = useState(false);

    console.log('MedicalFolder Props:', { patientId, userData, userRole });

    useEffect(() => {
        if (patientId) {
            fetchMedicalData();
        } else {
            setError('No patient ID provided');
            setLoading(false);
        }
    }, [patientId]);

    const fetchMedicalData = async () => {
        if (!patientId) {
            setError('Patient ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            console.log('Fetching medical data for patient ID:', patientId);
            
            const response = await fetch(`http://localhost:8000/account/medical_folder/${patientId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('Medical folder response status:', response.status);            if (!response.ok) {
                if (response.status === 404) {
                    // Patient has no medical folder yet, set empty array
                    console.log('Patient has no medical folder yet (404), setting empty array');
                    setMedicalData([]);
                    setError('');
                    return;
                }
                const errorText = await response.text();
                console.error('Medical folder error response:', errorText);
                throw new Error(`Failed to fetch medical data: ${response.status} ${errorText}`);
            }            const data = await response.json();
            console.log('Medical folder data received:', data);
            setMedicalData(data || []);
            setError('');
        } catch (err) {
            console.error('Error fetching medical data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        
        if (!patientId) {
            setError('No patient or medical folder selected. Please select a patient and ensure the medical folder is loaded.');
            return;
        }

        if (!newEntry.illness.trim() || !newEntry.notes.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            console.log('Adding medical entry for patient ID:', patientId);
            console.log('Entry data:', newEntry);

            const response = await fetch(`http://localhost:8000/account/medical_folder/${patientId}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },                body: JSON.stringify({
                    note: `Date: ${newEntry.date}\nIllness: ${newEntry.illness.trim()}\nNotes: ${newEntry.notes.trim()}`.trim(),
                    patient_id: patientId // Explicitly include patient ID
                }),
            });

            console.log('Add entry response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Add entry error response:', errorText);
                throw new Error(`Failed to add medical entry: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('Entry added successfully:', data);

            // Reset form
            setNewEntry({
                date: new Date().toISOString().split('T')[0],
                illness: '',
                notes: ''
            });
            setShowAddForm(false);
            setError('');

            // Refresh medical data
            fetchMedicalData();
        } catch (err) {
            console.error('Error adding medical entry:', err);
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading medical folder...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                <h5>Error Loading Medical Folder</h5>
                <p>{error}</p>
                <hr />
                <p><strong>Debug Information:</strong></p>
                <ul>
                    <li>Patient ID: {patientId || 'Not provided'}</li>
                    <li>User Role: {userRole || 'Unknown'}</li>
                    <li>User ID: {userData?.user?.id || 'Unknown'}</li>
                </ul>
                <button 
                    className="btn btn-outline-primary" 
                    onClick={fetchMedicalData}
                    disabled={!patientId}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="medical-folder">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>Medical Folder</h4>                {/* Only show Add Entry button for coordinators */}
                {userRole === 'coordinator' && (
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                        disabled={!patientId}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Add Entry
                    </button>
                )}
            </div>

            {/* Debug Info */}
            <div className="alert alert-info mb-3">
                <small>
                    <strong>Debug:</strong> Patient ID: {patientId}, 
                    Entries: {medicalData.length}, 
                    Role: {userRole}
                </small>
            </div>

            {showAddForm && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h5 className="mb-0">Add Medical Entry</h5>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleAddEntry}>
                            <div className="row">
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label">Date *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newEntry.date}
                                            onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-md-8">
                                    <div className="mb-3">
                                        <label className="form-label">Illness/Condition *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newEntry.illness}
                                            onChange={(e) => setNewEntry({...newEntry, illness: e.target.value})}
                                            placeholder="Enter illness or medical condition"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Notes *</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={newEntry.notes}
                                    onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                                    placeholder="Enter detailed notes about the condition or treatment"
                                    required
                                />
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-success">
                                    <i className="fas fa-save me-2"></i>
                                    Save Entry
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {medicalData.length === 0 ? (
                <div className="alert alert-info">
                    <h5>No Medical Records</h5>
                    <p>No medical folder data available. Add your first medical entry using the button above.</p>
                </div>
            ) : (                <div className="medical-entries">
                    {medicalData.map((entry, index) => (
                        <div key={entry.id || index} className="card mb-3">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">
                                    {entry.service || 'Medical Entry'}
                                </h6>
                                <small className="text-muted">
                                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </small>
                            </div>
                            <div className="card-body">
                                <p className="mb-0">{entry.note}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MedicalFolder;
