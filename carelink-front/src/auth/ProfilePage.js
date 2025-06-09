import React, { useEffect, useState, useRef } from 'react';
import './profile/ProfilePage.css';  // Keep profile-specific styles
import BaseLayout from './layout/BaseLayout';

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('user');
    const profileRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('accessToken');

                if (!token) {
                    // Redirect to login if token is missing
                    window.location.href = '/login';
                    return;
                }

                console.log('[DEBUG] Token:', token);
                const response = await fetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.status === 401) {
                    // Redirect to login page on 401 Unauthorized
                    window.location.href = '/login';
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch profile data.');
                }

                const data = await response.json();
                console.log('[DEBUG] Fetched Profile Data:', data); // Debugging fetched data
                console.log('[DEBUG] Family Data:', data.family_relationships); // Corrected key for family data
                setUserData(data);
            } catch (err) {
                setError('Failed to fetch profile data. Please try again.');
            }
        };

        fetchProfile();
    }, []);

    useEffect(() => {
        const profileElement = profileRef.current;
        if (!profileElement) return; // Add null check

        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = profileElement.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            profileElement.classList.add('dragging');
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            profileElement.style.left = `${initialX + dx}px`;
            profileElement.style.top = `${initialY + dy}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            profileElement.classList.remove('dragging');
        };

        profileElement.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            profileElement.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [profileRef]);    const renderContent = () => {
        switch (selectedTab) {
            case 'user':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-primary bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-user me-2 text-primary"></i>
                                User Information
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Email:</label>
                                    <p className="fs-6 fw-medium">{userData.user.email}</p>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">First Name:</label>
                                    <p className="fs-6 fw-medium">{userData.user.firstname}</p>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Last Name:</label>
                                    <p className="fs-6 fw-medium">{userData.user.lastname}</p>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Birthdate:</label>
                                    <p className="fs-6 fw-medium">{userData.user.birthdate}</p>
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-muted">Address:</label>
                                    <p className="fs-6 fw-medium">{userData.user.address}</p>
                                </div>
                                {userData.user.national_number && userData.user.national_number !== "null" && (
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">National Number:</label>
                                        <p className="fs-6 fw-medium">{userData.user.national_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'patient':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-success bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-user-injured me-2 text-success"></i>
                                Patient Information
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.patient ? (
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">Gender:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.gender}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">Blood Type:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.blood_type}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">Emergency Contact:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.emergency_contact}</p>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label text-muted">Illness:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.illness}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-info-circle text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">No patient information available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'family':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-info bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-users me-2 text-info"></i>
                                Family Relationships
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.family_relationships && userData.family_relationships.length > 0 ? (
                                <div className="row g-3">
                                    {userData.family_relationships.map((relation, index) => (
                                        <div key={index} className="col-12">
                                            <div className="card bg-light border-0">
                                                <div className="card-body py-3">
                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">Relation:</label>
                                                            <p className="fs-6 fw-medium mb-0">{relation.link}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">Family Member:</label>
                                                            {relation.user ? (
                                                                <p className="fs-6 fw-medium mb-0">{relation.user.full_name} ({relation.user.email})</p>
                                                            ) : (
                                                                <p className="fs-6 text-muted mb-0">Not Available</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-users text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">No family relationships available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'medical':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-warning bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-folder-medical me-2 text-warning"></i>
                                Medical Folder
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.medical_folder && userData.medical_folder.length > 0 ? (
                                <div className="row g-3">
                                    {userData.medical_folder.map((record, index) => (
                                        <div key={index} className="col-12">
                                            <div className="card bg-light border-0">
                                                <div className="card-body py-3">
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <label className="form-label text-muted">Date:</label>
                                                            <p className="fs-6 fw-medium mb-0">{record.created_at}</p>
                                                        </div>
                                                        <div className="col-md-8">
                                                            <label className="form-label text-muted">Notes:</label>
                                                            <p className="fs-6 fw-medium mb-0">{record.note || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-folder-open text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">No medical folder data available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-secondary bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-phone me-2 text-secondary"></i>
                                Contact Information
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.phone_numbers && userData.phone_numbers.length > 0 ? (
                                <div className="row g-3">
                                    {userData.phone_numbers.map((phone, index) => (
                                        <div key={index} className="col-md-6">
                                            <div className="card bg-light border-0">
                                                <div className="card-body py-3">
                                                    <label className="form-label text-muted">{phone.name}:</label>
                                                    <p className="fs-6 fw-medium mb-0">{phone.phone_number}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-phone-slash text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">No contact information available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    if (error) {
        return (
            <BaseLayout>
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-6">
                            <div className="alert alert-danger d-flex align-items-center" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                <div>{error}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    if (!userData) {
        return (
            <BaseLayout>
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-6">
                            <div className="card shadow-sm border-0">
                                <div className="card-body text-center py-5">
                                    <div className="spinner-border text-primary mb-3" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h5 className="text-muted">Loading Profile Information</h5>
                                    <p className="text-muted mb-0">Please wait while we fetch your data...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseLayout>
        );
    }return (
        <BaseLayout>
            <div className="container-fluid py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10 col-xl-8">
                        {/* Profile Header Card */}
                        <div className="card shadow-sm border-0 mb-4" ref={profileRef} style={{cursor: 'move'}}>
                            <div className="card-header bg-primary bg-opacity-10 border-0">
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-user-circle me-3 text-primary" style={{fontSize: '2rem'}}></i>
                                    <div>
                                        <h4 className="card-title mb-0">Profile Information</h4>                                        <div className="badge bg-primary bg-opacity-20 text-primary mt-1">
                                            <i className="fas fa-user-tag me-1"></i>
                                            Role: {userData.user.role === 'Family Patient' ? 'Patient' : userData.user.role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-body p-0">
                                <nav className="nav nav-pills nav-justified">
                                    <button 
                                        className={`nav-link ${selectedTab === 'user' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('user')}
                                    >
                                        <i className="fas fa-user me-2"></i>
                                        User Info
                                    </button>
                                    <button 
                                        className={`nav-link ${selectedTab === 'patient' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('patient')}
                                    >
                                        <i className="fas fa-user-injured me-2"></i>
                                        Patient Info
                                    </button>
                                    <button 
                                        className={`nav-link ${selectedTab === 'family' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('family')}
                                    >
                                        <i className="fas fa-users me-2"></i>
                                        Family
                                    </button>
                                    <button 
                                        className={`nav-link ${selectedTab === 'medical' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('medical')}
                                    >
                                        <i className="fas fa-folder-medical me-2"></i>
                                        Medical Folder
                                    </button>
                                    <button 
                                        className={`nav-link ${selectedTab === 'contact' ? 'active' : ''}`}
                                        onClick={() => setSelectedTab('contact')}
                                    >
                                        <i className="fas fa-phone me-2"></i>
                                        Contact
                                    </button>
                                </nav>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="profile-content">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
