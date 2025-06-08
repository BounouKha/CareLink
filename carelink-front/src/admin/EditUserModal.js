import React, { useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const ROLE_CHOICES = [
    { value: 'Administrative', label: 'Administrative' },
    { value: 'Patient', label: 'Patient' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Family Patient', label: 'Family Patient' },
    { value: 'Social Assistant', label: 'Social Assistant' },
    { value: 'Provider', label: 'Provider' },
    { value: 'Administrator', label: 'Administrator' },
];

const EditUserModal = ({ user, onClose, onSave }) => {
    const [selectedField, setSelectedField] = useState('');
    const [fieldValue, setFieldValue] = useState('');

    const handleFieldChange = (e) => {
        const value = e.target.value;
        if (selectedField === 'birthdate') {
            if (validateBirthdate(value)) {
                setFieldValue(value);
            }
        } else if (['is_active', 'is_superuser', 'is_admin'].includes(selectedField)) {
            setFieldValue(value === '1');
        } else {
            setFieldValue(value);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            if (selectedField === 'birthdate' && !validateBirthdate(fieldValue)) {
                const confirmProceed = window.confirm('Birthdate validation failed. Do you want to proceed anyway?');
                if (!confirmProceed) {
                    return;
                }
            }

            if (fieldValue !== user[selectedField]) {
                const payload = { [selectedField]: fieldValue };
                console.log('Payload:', payload); // Debugging payload

                const response = await fetch(`http://localhost:8000/account/edit-user/${user?.id}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Failed to update user.');
                }

                const data = await response.json();
                onSave({ ...user, ...data });
                setSelectedField('');
                setFieldValue('');
                alert('Changes saved successfully!');
                onClose();
            } else {
                alert('No changes were made.');
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const validateBirthdate = (date) => {
        const today = new Date();
        const selectedDate = new Date(date);
        let age = today.getFullYear() - selectedDate.getFullYear();
        const monthDiff = today.getMonth() - selectedDate.getMonth();
        const dayDiff = today.getDate() - selectedDate.getDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }

        if (selectedDate > today) {
            alert('Invalid date. Date cannot be in the future.');
            return false;
        }

        if (age < 18) {
            alert('Invalid date. Must be at least 18 years old.');
            return false;
        }

        return true;
    };    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-user-edit me-2 text-primary"></i>
                            Edit User: {user?.firstname || 'Unknown'} {user?.lastname || ''}
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-primary bg-opacity-10 border-0">
                                <h5 className="card-title mb-0">
                                    <i className="fas fa-edit me-2 text-primary"></i>
                                    Field Selection
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="fas fa-list me-2 text-muted"></i>
                                        Select Field to Edit
                                    </label>
                                    <select
                                        className="form-select"
                                        value={selectedField}
                                        onChange={(e) => {
                                            const selected = e.target.value;
                                            setSelectedField(selected);
                                            setFieldValue(user[selected] || '');
                                        }}
                                    >
                                        <option value="">Choose a field to edit...</option>
                                        <option value="firstname">First Name</option>
                                        <option value="lastname">Last Name</option>
                                        <option value="email">Email Address</option>
                                        <option value="birthdate">Birthdate</option>
                                        <option value="role">Role</option>
                                        <option value="address">Address</option>
                                        <option value="national_number">National Number</option>
                                        <option value="password">Password</option>
                                        <option value="is_active">Account Status (Active/Inactive)</option>
                                        <option value="is_superuser">Superuser Privileges</option>
                                        <option value="is_admin">Admin Privileges</option>
                                    </select>
                                </div>

                                {selectedField && (
                                    <div className="mt-4">
                                        <div className="card bg-light border-0">
                                            <div className="card-body">
                                                <label className="form-label fw-medium">
                                                    <i className="fas fa-pen me-2 text-secondary"></i>
                                                    Edit {selectedField.charAt(0).toUpperCase() + selectedField.slice(1).replace('_', ' ')}
                                                </label>
                                                {selectedField === 'birthdate' ? (
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        value={fieldValue}
                                                        onChange={(e) => {
                                                            const date = e.target.value;
                                                            if (validateBirthdate(date)) {
                                                                setFieldValue(date);
                                                            }
                                                        }}
                                                    />
                                                ) : selectedField === 'role' ? (
                                                    <select
                                                        className="form-select"
                                                        value={fieldValue}
                                                        onChange={handleFieldChange}
                                                    >
                                                        <option value="">Select Role</option>
                                                        {ROLE_CHOICES.map((role) => (
                                                            <option key={role.value} value={role.value}>
                                                                {role.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : ['is_superuser', 'is_active', 'is_admin'].includes(selectedField) ? (
                                                    <select
                                                        className="form-select"
                                                        value={fieldValue ? '1' : '0'}
                                                        onChange={handleFieldChange}
                                                    >
                                                        <option value="1">
                                                            {selectedField === 'is_active' ? 'Active' : 'Yes'}
                                                        </option>
                                                        <option value="0">
                                                            {selectedField === 'is_active' ? 'Inactive' : 'No'}
                                                        </option>
                                                    </select>
                                                ) : selectedField === 'address' ? (
                                                    <textarea
                                                        className="form-control"
                                                        rows="3"
                                                        value={fieldValue}
                                                        onChange={handleFieldChange}
                                                        placeholder="Enter full address"
                                                    />
                                                ) : (
                                                    <input
                                                        type={selectedField === 'password' ? 'password' : selectedField === 'email' ? 'email' : 'text'}
                                                        className="form-control"
                                                        value={fieldValue}
                                                        onChange={handleFieldChange}
                                                        placeholder={`Enter ${selectedField.replace('_', ' ')}`}
                                                    />
                                                )}
                                                
                                                {selectedField === 'birthdate' && (
                                                    <div className="form-text">
                                                        <i className="fas fa-info-circle me-1"></i>
                                                        User must be at least 18 years old
                                                    </div>
                                                )}
                                                
                                                {selectedField === 'password' && (
                                                    <div className="form-text">
                                                        <i className="fas fa-shield-alt me-1"></i>
                                                        Enter a new password to change it
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={handleSave} 
                            disabled={!selectedField}
                        >
                            <i className="fas fa-save me-2"></i>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
