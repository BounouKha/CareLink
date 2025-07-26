import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../layout/BaseLayout';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import EmailVerificationModal from './EmailVerificationModal';
import './RegisterPage.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        firstname: '',
        lastname: '',
        password: '',
        confirmPassword: '',
        birthdate: '',
        address: '',
        national_number: '',
        role: 'Patient' // Default role
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const navigate = useNavigate();

    // Use translation hooks
    const { auth, common, placeholders, errors } = useCareTranslation();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/account/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    firstname: formData.firstname,
                    lastname: formData.lastname,
                    password: formData.password,
                    birthdate: formData.birthdate,
                    address: formData.address,
                    national_number: formData.national_number,
                    role: formData.role
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }

            const data = await response.json();
            
            // Registration successful - show verification modal
            setRegisteredEmail(formData.email);
            setShowVerificationModal(true);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal handlers
    const handleVerificationSuccess = () => {
        setShowVerificationModal(false);
        alert('Email verified successfully! You can now login with your credentials.');
        navigate('/login');
    };

    const handleCloseModal = () => {
        setShowVerificationModal(false);
        // User can try registering again or modify their email
    };

    return (
        <>
            <BaseLayout>
                <div className="register-page">
                    <div className="register-container">
                        <div className="register-header">
                            <h2>{auth('createAccount')}</h2>
                            <p className="register-subtitle">Join the CareLink community</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="register-form">
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="firstname">
                                        <i className="fas fa-user"></i>
                                        First Name
                                    </label>
                                    <input
                                        id="firstname"
                                        name="firstname"
                                        type="text"
                                        placeholder="Enter your first name"
                                        value={formData.firstname}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group half-width">
                                    <label htmlFor="lastname">
                                        <i className="fas fa-user"></i>
                                        Last Name
                                    </label>
                                    <input
                                        id="lastname"
                                        name="lastname"
                                        type="text"
                                        placeholder="Enter your last name"
                                        value={formData.lastname}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">
                                    <i className="fas fa-envelope"></i>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="password">
                                        <i className="fas fa-lock"></i>
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group half-width">
                                    <label htmlFor="confirmPassword">
                                        <i className="fas fa-lock"></i>
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="birthdate">
                                    <i className="fas fa-calendar"></i>
                                    Birth Date
                                </label>
                                <input
                                    id="birthdate"
                                    name="birthdate"
                                    type="date"
                                    value={formData.birthdate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="address">
                                    <i className="fas fa-map-marker-alt"></i>
                                    Address
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    placeholder="Enter your address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="national_number">
                                    <i className="fas fa-id-card"></i>
                                    National Number
                                </label>
                                <input
                                    id="national_number"
                                    name="national_number"
                                    type="text"
                                    placeholder="Enter your national number"
                                    value={formData.national_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="role">
                                    <i className="fas fa-user-tag"></i>
                                    Role
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Patient">Patient</option>
                                    <option value="Caregiver">Caregiver</option>
                                </select>
                            </div>

                            {error && (
                                <div className="error-message">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="btn btn-primary register-btn">
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-user-plus"></i>
                                        {auth('createAccount')}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="register-footer">
                            <p>{auth('alreadyHaveAccount')}</p>
                            <Link to="/login" className="btn btn-secondary">
                                <i className="fas fa-sign-in-alt"></i>
                                {auth('signIn')}
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* Email Verification Modal */}
                <EmailVerificationModal
                    email={registeredEmail}
                    isOpen={showVerificationModal}
                    onClose={handleCloseModal}
                    onVerified={handleVerificationSuccess}
                />
            </BaseLayout>
        </>
    );
};

export default RegisterPage;
