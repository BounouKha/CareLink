import React, { useState } from 'react';
import './EditUserForm.css';

const ROLE_CHOICES = [
    { value: 'Administrative', label: 'Administrative' },
    { value: 'Patient', label: 'Patient' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Family Patient', label: 'Family Patient' },
    { value: 'Social Assistant', label: 'Social Assistant' },
    { value: 'Provider', label: 'Provider' },
    { value: 'Administrator', label: 'Administrator' },
];

const EditUserForm = ({ user, onClose, onUpdate, currentUser }) => {
    const [selectedField, setSelectedField] = useState('');
    const [fieldValue, setFieldValue] = useState('');

    const handleFieldChange = (e) => {
        const value = e.target.value;
        if (selectedField === 'birthdate') {
            if (validateBirthdate(value)) {
                setFieldValue(value);
            }
        } else if (selectedField === 'is_active' || selectedField === 'is_superuser' || selectedField === 'is_admin') {
            setFieldValue(value === '1'); // Convert "1" to true and "0" to false
        } else {
            setFieldValue(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Only include the field in the payload if its value has been modified
            if (fieldValue !== user[selectedField]) {
                const payload = { [selectedField]: fieldValue };

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
                onUpdate({ ...user, ...data }); // Update parent component state dynamically
                setSelectedField(''); // Clear the selected field
                setFieldValue(''); // Clear the field value
                alert('Changes saved successfully!');

                // Clear the field value and close the form after saving changes
                onClose(); // Close the form
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
    };

    return (
        <div className="edit-user-form-modal">
            <div className="edit-user-form">
                <form onSubmit={handleSubmit}>
                    <h2>Edit User: {user?.lastname || 'Unknown'} {user?.firstname || ''}</h2>
                    <label>
                        Select Field to Edit:
                        <select
                            value={selectedField}
                            onChange={(e) => {
                                const selected = e.target.value;
                                setSelectedField(selected);
                                setFieldValue(user[selected] || ''); // Ensure the current value is displayed
                            }}
                        >
                            <option value="">Select Field</option>
                            <option value="lastname">Last Name</option>
                            <option value="firstname">First Name</option>
                            <option value="email">Email</option>
                            <option value="birthdate">Birthdate</option>
                            <option value="role">Role</option>
                            <option value="is_superuser">Is Superuser</option>
                            <option value="password">Password</option>
                            <option value="address">Address</option>
                            <option value="is_active">Is Active</option>
                            <option value="is_admin">Is Admin</option>
                            <option value="national_number">National Number</option>
                        </select>
                    </label>

                    {selectedField && (
                        <label>
                            {selectedField.charAt(0).toUpperCase() + selectedField.slice(1)}:
                            {selectedField === 'birthdate' ? (
                                <input
                                    type="date"
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
                            ) : selectedField === 'is_superuser' || selectedField === 'is_active' || selectedField === 'is_admin' ? (
                                <select
                                    value={fieldValue ? '1' : '0'}
                                    onChange={handleFieldChange}
                                >
                                    <option value="1">True</option>
                                    <option value="0">False</option>
                                </select>
                            ) : (
                                <input
                                    type={selectedField === 'password' ? 'password' : 'text'}
                                    value={fieldValue}
                                    onChange={handleFieldChange}
                                />
                            )}
                        </label>
                    )}

                    <button type="submit" disabled={!selectedField}>Save Changes</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default EditUserForm;
