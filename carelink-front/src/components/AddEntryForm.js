import React from 'react';

const AddEntryForm = ({ newNote, setNewNote, selectedService, setSelectedService, services = [], onSubmit, onCancel }) => {
    console.log('[DEBUG] Services passed to AddEntryForm:', services);
    console.log('[DEBUG] Services length:', services.length);
    console.log('[DEBUG] Services type:', typeof services);
    console.log('[DEBUG] Selected service:', selectedService);

    return (
        <div className="modal-dialog modal-md">
            <div className="modal-content">
                {/* Modal Header */}
                <div className="modal-header border-bottom bg-white">
                    <h5 className="modal-title fw-semibold text-dark">Add Entry</h5>
                    <button 
                        type="button" 
                        className="btn-close btn-close-dark"
                        onClick={onCancel}
                        aria-label="Close"
                    ></button>
                </div>
                
                {/* Modal Body */}
                <div className="modal-body bg-white">
                    <form>
                        {/* Service Selection */}
                        <div className="mb-3">
                            <label className="form-label small fw-medium text-dark">Service</label>
                            <select
                                className="form-select border-light"
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
                        </div>

                        {/* Note Input */}
                        <div className="mb-3">
                            <label className="form-label small fw-medium text-dark">Note</label>
                            <textarea
                                className="form-control border-light"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Enter your note here..."
                                rows="4"
                            />
                        </div>

                        {/* Debug Info (remove in production) */}
                        <div className="mb-3">
                            <small className="text-muted">
                                Debug: {services.length} services loaded
                            </small>
                        </div>
                    </form>
                </div>
                
                {/* Modal Footer */}
                <div className="modal-footer border-top bg-white">
                    <button 
                        type="button" 
                        className="btn btn-light me-2" 
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={onSubmit}                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEntryForm;
