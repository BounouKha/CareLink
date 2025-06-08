import React, { useState, useEffect } from 'react';
import SearchableSelect from '../components/SearchableSelect';
// CSS is now handled by UnifiedBaseLayout.css

const AddFamilyRelationModal = ({ userId, onClose, onRelationAdded }) => {
    const [formData, setFormData] = useState({
        patient_id: '',
        link: '',
    });
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch('http://localhost:8000/account/views_patient/', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch patients.');
            }

            const data = await response.json();
            setPatients(data.results || []);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handlePatientSelect = (e) => {
        setFormData({
            ...formData,
            patient_id: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // This should be a different endpoint for adding relationships to existing family patients
            const response = await fetch(`http://localhost:8000/account/family-patient/${userId}/add-relation/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to add family relationship.');
            }

            const data = await response.json();
            onRelationAdded(data);
            alert('Family relationship added successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="modal-dialog modal-dialog-centered modal-lg" style={{
                margin: 'auto'
            }}>
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">
                            <i className="fas fa-plus me-2"></i>
                            Add New Family Relationship
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="alert alert-success" role="alert">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Add Relationship:</strong> Link this family member to an additional patient 
                            for extended care coordination access.
                        </div>
                        
                        <div className="card">
                            <div className="card-header bg-light">
                                <h6 className="card-title mb-0">
                                    <i className="fas fa-link me-2"></i>
                                    New Patient Connection
                                </h6>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit} id="addRelationForm">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-medium">
                                                <i className="fas fa-user-injured me-2"></i>
                                                Select Patient *
                                            </label>
                                            <SearchableSelect
                                                name="patient_id"
                                                value={formData.patient_id}
                                                onChange={handlePatientSelect}
                                                options={patients}
                                                placeholder={loading ? "Loading patients..." : "Search and select a patient..."}
                                                required
                                                formatDisplay={(patient) => `${patient.firstname} ${patient.lastname}${patient.national_number ? ` (ID: ${patient.national_number})` : ` (ID: ${patient.id})`}`}
                                                displayKey="firstname"
                                                valueKey="id"
                                            />
                                            <small className="form-text text-muted">
                                                Search by name or ID to find the additional patient for this family member
                                            </small>
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <label htmlFor="link" className="form-label fw-medium">
                                                <i className="fas fa-heart me-2"></i>
                                                Relationship *
                                            </label>
                                            <input
                                                type="text"
                                                id="link"
                                                name="link"
                                                className="form-control"
                                                value={formData.link}
                                                onChange={handleChange}
                                                placeholder="e.g., Spouse, Child, Parent, Sibling"
                                                required
                                            />
                                            <small className="form-text text-muted">
                                                Describe the relationship to this additional patient
                                            </small>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="addRelationForm"
                            className="btn btn-success"
                        >
                            <i className="fas fa-link me-2"></i>
                            Add Relationship
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddFamilyRelationModal;
