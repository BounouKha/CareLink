import React, { useState } from 'react';
import './ManageUsers.css';

const CreateUserForm = ({ onCreate, onClose }) => {
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        is_active: true,
        is_superuser: false,
        is_staff: false,
        national_number: '',
        address: '',
        role: '',
        birthdate: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(formData);
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>Create User</h2>
                <form onSubmit={handleSubmit} className="create-user-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>First Name:</label>
                            <input
                                type="text"
                                name="firstname"
                                value={formData.firstname}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name:</label>
                            <input
                                type="text"
                                name="lastname"
                                value={formData.lastname}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email:</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password:</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Active:</label>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Superuser:</label>
                            <input
                                type="checkbox"
                                name="is_superuser"
                                checked={formData.is_superuser}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Staff:</label>
                            <input
                                type="checkbox"
                                name="is_staff"
                                checked={formData.is_staff}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>National Number:</label>
                            <input
                                type="text"
                                name="national_number"
                                value={formData.national_number}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Address:</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Role:</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a role</option>
                                <option value="Coordinator">Coordinator</option>
                                <option value="Patient">Patient</option>
                                <option value="Provider">Provider</option>
                                <option value="Social Assistant">Social Assistant</option>
                                <option value="Family Member">Family Member</option>
                                <option value="Administrative">Administrative</option>
                                <option value="Administrator">Administrator</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Birthdate:</label>
                            <input
                                type="date"
                                name="birthdate"
                                value={formData.birthdate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit">Create</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUserForm;
