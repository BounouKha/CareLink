import React, { useState } from 'react';
import './CreateAdministrativeModal.css';

const CreateAdministrativeModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        is_internal: true,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Sending data to backend:', { userId, role_specific_data: formData });
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/administrative/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create administrative profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Administrative profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create Administrative Profile</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Internal:
                        <input
                            type="checkbox"
                            name="is_internal"
                            checked={formData.is_internal}
                            onChange={handleChange}
                        />
                    </label>
                    <button type="submit">Create Profile</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default CreateAdministrativeModal;
