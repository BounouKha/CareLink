import React, { useState } from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ profile, onClose, onSave }) => {
    const [fields, setFields] = useState({ firstname: profile.firstname, lastname: profile.lastname });
    const [error, setError] = useState(null);

    const handleFieldChange = (field, value) => {
        setFields((prevFields) => ({ ...prevFields, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/profiles/${profile.id}/edit/${profile.role}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(fields),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile.');
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <h2>Edit Profile</h2>
                {error && <p className="error">{error}</p>}
                {Object.entries(fields).map(([key, value]) => (
                    <label key={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                        />
                    </label>
                ))}
                <button onClick={handleSave}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default EditProfileModal;
