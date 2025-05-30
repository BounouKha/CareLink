import React, { useState } from 'react';
import './CreateSocialAssistantModal.css';

const CreateSocialAssistantModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        is_internal: false,
        from_hospital: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/social-assistant/create/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to create social assistant profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Social Assistant profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create Social Assistant Profile</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Is Internal:
                        <select
                            name="is_internal"
                            value={formData.is_internal}
                            onChange={handleChange}
                            required
                        >
                            <option value={true}>Yes</option>
                            <option value={false}>No</option>
                        </select>
                    </label>
                    <label>
                        From Hospital:
                        <input
                            type="text"
                            name="from_hospital"
                            value={formData.from_hospital}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <button type="submit">Create Profile</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default CreateSocialAssistantModal;
