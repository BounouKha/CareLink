import React, { useState } from 'react';
import './CreatePatientModal.css';

const CreatePatientModal = ({ userId, onClose, onProfileCreated }) => {
    const [formData, setFormData] = useState({
        gender: '',
        blood_type: '',
        emergency_contact: '',
        katz_score: '',
        it_score: '',
        illness: '',
        critical_information: '',
        medication: '',
        social_price: false,
        is_alive: true,
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

            const response = await fetch(`http://localhost:8000/account/users/${userId}/create/patient/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, role_specific_data: formData }),
            });

            if (!response.ok) {
                throw new Error('Failed to create patient profile.');
            }

            const data = await response.json();
            onProfileCreated(data);
            alert('Patient profile created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create Patient Profile</h2>
                <form onSubmit={handleSubmit}>
                    <label>
                        Gender:
                        <select name="gender" value={formData.gender} onChange={handleChange} required>
                            <option value="">Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </label>
                    <label>
                        Blood Type:
                        <input type="text" name="blood_type" value={formData.blood_type} onChange={handleChange} />
                    </label>
                    <label>
                        Emergency Contact:
                        <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} required />
                    </label>
                    <label>
                        Katz Score:
                        <input type="number" name="katz_score" value={formData.katz_score} onChange={handleChange} />
                    </label>
                    <label>
                        IT Score:
                        <input type="number" name="it_score" value={formData.it_score} onChange={handleChange} />
                    </label>
                    <label>
                        Illness:
                        <input type="text" name="illness" value={formData.illness} onChange={handleChange} />
                    </label>
                    <label>
                        Critical Information:
                        <input type="text" name="critical_information" value={formData.critical_information} onChange={handleChange} />
                    </label>
                    <label>
                        Medication:
                        <input type="text" name="medication" value={formData.medication} onChange={handleChange} />
                    </label>
                    <label>
                        Social Price:
                        <input type="checkbox" name="social_price" checked={formData.social_price} onChange={handleChange} />
                    </label>
                    <label>
                        Is Alive:
                        <input type="checkbox" name="is_alive" checked={formData.is_alive} onChange={handleChange} />
                    </label>
                    <button type="submit">Create Profile</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default CreatePatientModal;
