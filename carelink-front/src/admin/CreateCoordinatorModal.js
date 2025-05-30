import React, { useState } from 'react';
import './CreateCoordinatorModal.css';

const CreateCoordinatorModal = ({ userId, onClose, onProfileCreated }) => {
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
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/coordinator/create/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to create coordinator profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Coordinator profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create Coordinator Profile</h2>
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

export default CreateCoordinatorModal;
