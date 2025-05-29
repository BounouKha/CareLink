import React, { useState } from 'react';
import './CreateUserModal.css';

const ROLE_CHOICES = [
    { value: 'Administrative', label: 'Administrative' },
    { value: 'Patient', label: 'Patient' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Family Patient', label: 'Family Patient' },
    { value: 'Social Assistant', label: 'Social Assistant' },
    { value: 'Provider', label: 'Provider' },
    { value: 'Administrator', label: 'Administrator' },
];

const CreateUserModal = ({ onClose, onSave }) => {
    const [userData, setUserData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        role: '',
        birthdate: '',
        address: '',
        national_number: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            // Remove national_number field if it's empty
            if (!userData.national_number) {
                delete userData.national_number;
            }

            const response = await fetch('http://localhost:8000/account/create-user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                throw new Error('Failed to create user.');
            }

            const newUser = await response.json();
            onSave(newUser);
            alert('User created successfully!');
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create New User</h2>
                <form>
                    <label>First Name</label>
                    <input
                        type="text"
                        name="firstname"
                        value={userData.firstname}
                        onChange={handleChange}
                    />

                    <label>Last Name</label>
                    <input
                        type="text"
                        name="lastname"
                        value={userData.lastname}
                        onChange={handleChange}
                    />

                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleChange}
                    />

                    <label>Role</label>
                    <select
                        name="role"
                        value={userData.role}
                        onChange={handleChange}
                    >
                        <option value="">Select Role</option>
                        {ROLE_CHOICES.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>

                    <label>Birthdate</label>
                    <input
                        type="date"
                        name="birthdate"
                        value={userData.birthdate}
                        onChange={handleChange}
                    />

                    <label>Address</label>
                    <input
                        type="text"
                        name="address"
                        value={userData.address}
                        onChange={handleChange}
                    />

                    <label>National Number</label>
                    <input
                        type="text"
                        name="national_number"
                        value={userData.national_number}
                        onChange={handleChange}
                    />

                    <button type="button" onClick={handleSave}>Create User</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default CreateUserModal;
