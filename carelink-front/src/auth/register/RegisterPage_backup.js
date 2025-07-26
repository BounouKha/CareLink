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

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
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
                                {auth('emailAddress')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder={placeholders('email')}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group half-width">
                                <label htmlFor="password">
                                    <i className="fas fa-lock"></i>
                                    {auth('password')}
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder={placeholders('password')}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength="6"
                                />
                            </div>
                            
                            <div className="form-group half-width">
                                <label htmlFor="confirmPassword">
                                    <i className="fas fa-lock"></i>
                                    {auth('confirmPassword')}
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    minLength="6"
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
                                <i className="fas fa-home"></i>
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
                                National Number (Optional)
                            </label>
                            <input
                                id="national_number"
                                name="national_number"
                                type="text"
                                placeholder="Enter your national number"
                                value={formData.national_number}
                                onChange={handleChange}
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
                                <option value="Family Patient">Family Patient</option>
                                <option value="Provider">Healthcare Provider</option>
                            </select>
                        </div>
                        
                        {error && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-triangle"></i>
                                {error}
                            </div>
                        )}
                        
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <i className="fas fa-user-plus"></i>
                            {loading ? 'Creating Account...' : auth('createAccount')}
                        </button>
                    </form>
                    
                    <div className="register-footer">
                        <div className="divider">
                            <span>Already have an account?</span>
                        </div>
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

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('user');

    // Fetch user data on component mount
    React.useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // Include auth token or credentials if required
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                setUserData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const renderContent = () => {
        switch (selectedTab) {
            case 'user':
                return (
                    <div className="tab-content" id="user">
                        <h3>User Information</h3>
                        <p>Email: {userData.user.email}</p>
                        <p>First Name: {userData.user.firstname}</p>
                        <p>Last Name: {userData.user.lastname}</p>
                        <p>Role: {userData.user.role}</p>
                        {/* Add more fields as necessary */}
                    </div>
                );
            case 'medical':
                return (
                    <div className="tab-content" id="medical">
                        <h3>Medical Information</h3>
                        {/* Render medical information fields */}
                    </div>
                );
            case 'folder':
                return (
                    <div className="tab-content" id="folder">
                        <h3>Medical Folder</h3>
                        {/* Render medical folder content */}
                    </div>
                );
            case 'contact':
                return (
                    <div className="tab-content" id="contact">
                        <h3>Contact Information</h3>
                        {/* Render contact information fields */}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <BaseLayout>
            <div className="profile-page">
                <div className="profile-container">
                    <div className="profile-header">
                        <h2>Welcome, {userData.user.firstname}!</h2>
                        <p className="profile-subtitle">Manage your account and settings</p>
                    </div>
                    
                    <div className="profile-tabs">
                        <button
                            onClick={() => setSelectedTab('user')}
                            className={`profile-tab ${selectedTab === 'user' ? 'active' : ''}`}
                        >
                            <span className="tab-icon">👤</span>
                            <span className="tab-label">User Information</span>
                        </button>
                        
                        {/* Only show other tabs if user has a role */}
                        {userData?.user?.role && userData.user.role !== 'null' && userData.user.role !== 'undefined' && (
                            <>
                                <button
                                    onClick={() => setSelectedTab('medical')}
                                    className={`profile-tab ${selectedTab === 'medical' ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">🏥</span>
                                    <span className="tab-label">Medical Information</span>
                                </button>
                                
                                <button
                                    onClick={() => setSelectedTab('folder')}
                                    className={`profile-tab ${selectedTab === 'folder' ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">📁</span>
                                    <span className="tab-label">Medical Folder</span>
                                </button>
                                
                                <button
                                    onClick={() => setSelectedTab('contact')}
                                    className={`profile-tab ${selectedTab === 'contact' ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">📞</span>
                                    <span className="tab-label">Contact Information</span>
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div className="profile-content">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default RegisterPage;