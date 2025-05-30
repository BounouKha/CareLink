import React, { useState } from 'react';
import './CreateFamilyPatientModal.css';

const CreateFamilyPatientModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        patient_id: '',
        link: '',
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

            const response = await fetch(`http://localhost:8000/family-patient/create/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to create family patient profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Family Patient profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create Family Patient Profile</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Patient ID:
                        <input
                            type="text"
                            name="patient_id"
                            value={formData.patient_id}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Link:
                        <input
                            type="text"
                            name="link"
                            value={formData.link}
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

export default CreateFamilyPatientModal;
