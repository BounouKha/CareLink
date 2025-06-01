import React from 'react';

const AddEntryForm = ({ newNote, setNewNote, selectedService, setSelectedService, services = [], onSubmit, onCancel }) => {
    console.log('[DEBUG] Services passed to AddEntryForm:', services);
    console.log('[DEBUG] Services length:', services.length);
    console.log('[DEBUG] Services type:', typeof services);
    console.log('[DEBUG] Selected service:', selectedService);    return (
        <div className="modal-content">
            <div className="modal-header">
                <h2>Add Entry</h2>                <button 
                    className="modal-close-button" 
                    onClick={onCancel}
                >
                    ×
                </button>
            </div>
            <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note here..."
                rows="5"
            />            <label>
                Service:
                <select
                    value={selectedService}
                    onChange={(e) => {
                        console.log('[DEBUG] Service selected:', e.target.value);
                        setSelectedService(e.target.value);
                    }}
                >
                    <option value="">Select a service</option>
                    {services && services.length > 0 ? (
                        services.map((service) => (
                            <option key={service.id} value={service.id}>{service.name}</option>
                        ))
                    ) : (
                        <option disabled>No services available</option>
                    )}
                </select>
            </label>
            <p style={{fontSize: '12px', color: '#666'}}>
                Debug: {services.length} services loaded
            </p>
            <button onClick={onSubmit}>Submit</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    );
};

export default AddEntryForm;
