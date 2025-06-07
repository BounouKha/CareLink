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
        password: 'Password123@!',
        role: '',
        birthdate: '',
        address: '',
        national_number: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData((prevData) => ({ ...prevData, [name]: value }));
    };    const handleSave = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Token:', token ? 'Present' : 'Missing'); // Debug log
            
            if (!token) {
                alert('No access token found. Please log in again.');
                window.location.href = '/login';
                return;
            }

            // Remove national_number field if it's empty
            const userDataToSend = { ...userData };
            if (!userDataToSend.national_number) {
                delete userDataToSend.national_number;
            }
            
            console.log('Sending user data:', userDataToSend); // Debug log

            const response = await fetch('http://localhost:8000/account/create-user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(userDataToSend),
            });

            console.log('Response status:', response.status); // Debug log

            if (response.status === 401) {
                alert('Your session has expired. Please log in again.');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error response:', errorData);
                throw new Error(errorData.message || `Failed to create user. Status: ${response.status}`);
            }

            const newUser = await response.json();
            onSave(newUser);
            alert('User created successfully!');
            onClose();
        } catch (err) {
            console.error('Error creating user:', err);
            alert(`Error: ${err.message}`);
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
                    />                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleChange}
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={userData.password}
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
