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
    };    return (
        <div className="modal-overlay">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="fas fa-user-plus me-2 text-primary"></i>
                            Create New User
                        </h4>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-primary bg-opacity-10 border-0">
                                <h5 className="card-title mb-0">
                                    <i className="fas fa-user-cog me-2 text-primary"></i>
                                    User Information
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-user me-2 text-muted"></i>
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            name="firstname"
                                            className="form-control"
                                            value={userData.firstname}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-user me-2 text-muted"></i>
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            name="lastname"
                                            className="form-control"
                                            value={userData.lastname}
                                            onChange={handleChange}
                                            placeholder="Enter last name"
                                            required
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">
                                            <i className="fas fa-envelope me-2 text-muted"></i>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-control"
                                            value={userData.email}
                                            onChange={handleChange}
                                            placeholder="Enter email address"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-lock me-2 text-muted"></i>
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control"
                                            value={userData.password}
                                            onChange={handleChange}
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-user-tag me-2 text-muted"></i>
                                            Role
                                        </label>
                                        <select
                                            name="role"
                                            className="form-select"
                                            value={userData.role}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Role</option>
                                            {ROLE_CHOICES.map((role) => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-calendar me-2 text-muted"></i>
                                            Birthdate
                                        </label>
                                        <input
                                            type="date"
                                            name="birthdate"
                                            className="form-control"
                                            value={userData.birthdate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <i className="fas fa-id-card me-2 text-muted"></i>
                                            National Number
                                        </label>
                                        <input
                                            type="text"
                                            name="national_number"
                                            className="form-control"
                                            value={userData.national_number}
                                            onChange={handleChange}
                                            placeholder="Enter national number (optional)"
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">
                                            <i className="fas fa-map-marker-alt me-2 text-muted"></i>
                                            Address
                                        </label>
                                        <textarea
                                            name="address"
                                            className="form-control"
                                            rows="2"
                                            value={userData.address}
                                            onChange={handleChange}
                                            placeholder="Enter full address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times me-2"></i>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>
                            <i className="fas fa-user-plus me-2"></i>
                            Create User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateUserModal;
