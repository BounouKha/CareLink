import React, { useEffect, useState, useRef } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from '../layout/BaseLayout';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';
import { formatBirthdateWithAge, getAgeDisplay, calculateAge } from '../../utils/ageUtils';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);    
    const [selectedTab, setSelectedTab] = useState('user');
    const [linkedPatients, setLinkedPatients] = useState([]);
    const profileRef = useRef(null);
    
    // Use translation hooks
    const { profile, common, auth } = useCareTranslation();
    
    // Use modern authentication API
    const { get, loading, error: apiError } = useAuthenticatedApi();    useEffect(() => {
        const fetchProfile = async () => {
            console.log('[DEBUG] Starting profile data fetch');
            try {
                // Check authentication first
                if (!tokenManager.isAuthenticated()) {
                    console.log('[DEBUG] User not authenticated, redirecting to login');
                    window.location.href = '/login';
                    return;
                }

                console.log('[DEBUG] Fetching profile data...');
                const data = await get('http://localhost:8000/account/profile/');
                console.log('[DEBUG] Fetched Profile Data:', data);
                setUserData(data);
                  
                // If user is a Family Patient, fetch linked patient info
                if (data.user.role === 'Family Patient') {
                    console.log('[DEBUG] User is Family Patient, fetching linked patients...');
                    try {
                        const linkedData = await get('http://localhost:8000/account/family-patient/linked-patient/');
                        console.log('[DEBUG] Linked Patients Data:', linkedData);
                        
                        // Handle both old (linked_patient) and new (linked_patients) API format
                        if (linkedData.linked_patients && Array.isArray(linkedData.linked_patients)) {
                            console.log('[DEBUG] Using linked_patients array format');
                            setLinkedPatients(linkedData.linked_patients);
                        } else if (linkedData.linked_patient) {
                            console.log('[DEBUG] Using legacy linked_patient format');
                            // Fallback for old API format
                            setLinkedPatients([linkedData.linked_patient]);
                        } else {
                            console.log('[DEBUG] No linked patients found in response');
                            setLinkedPatients([]);
                        }
                    } catch (err) {
                        console.error('[DEBUG] Error fetching linked patients:', err);
                        // Don't fail the entire profile load if linked patients fail
                    }
                } else {
                    console.log('[DEBUG] User is not Family Patient, role:', data.user.role);
                }
            } catch (err) {
                console.error('[DEBUG] Error fetching profile:', err);
                setError('Failed to fetch profile data. Please try again.');
                
                // If it's an authentication error, redirect to login
                if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                    console.log('[DEBUG] Authentication error, redirecting to login');
                    tokenManager.handleLogout();
                }
            }
        };        fetchProfile();
    }, [get]); // Now safe to use [get] as dependency since it's memoized

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
                        <div className="card-header bg-primary bg-opacity-10 border-0">                            <h5 className="card-title mb-0">
                                <i className="fas fa-user me-2 text-primary"></i>
                                {profile('personalInfo')}
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">                                <div className="col-md-6">
                                    <label className="form-label text-muted">{auth('emailAddress')}:</label>
                                    <p className="fs-6 fw-medium">{userData.user.email}</p>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">{profile('firstName')}:</label>
                                    <p className="fs-6 fw-medium">{userData.user.firstname}</p>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted">{profile('lastName')}:</label>
                                    <p className="fs-6 fw-medium">{userData.user.lastname}</p>
                                </div>                                <div className="col-md-6">
                                    <label className="form-label text-muted">{profile('birthdate')}:</label>
                                    <p className="fs-6 fw-medium">{formatBirthdateWithAge(userData.user.birthdate)}</p>
                                </div>                                <div className="col-12">
                                    <label className="form-label text-muted">{common('address')}:</label>
                                    <p className="fs-6 fw-medium">{userData.user.address}</p>
                                </div>
                                {userData.user.national_number && userData.user.national_number !== "null" && (
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">{profile('nationalNumber')}:</label>
                                        <p className="fs-6 fw-medium">{userData.user.national_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );            case 'patient':
                return (
                    <div className="card shadow-sm border-0">                        <div className="card-header bg-success bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-user-injured me-2 text-success"></i>
                                {userData.user.role === 'Family Patient' ? profile('linkedPatientInfo') : profile('patientInfo')}
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.user.role === 'Family Patient' ? (
                                linkedPatients && linkedPatients.length > 0 ? (
                                    <div className="row g-3">
                                        {linkedPatients.map((patient, index) => (
                                            <div key={index} className="col-12">
                                                <div className="card bg-light border-0">
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                                            <h6 className="card-title mb-0">{patient.firstname} {patient.lastname}</h6>
                                                            <span className="badge bg-primary">{patient.relationship || profile('familyMember')}</span>
                                                        </div>
                                                        <div className="row g-2">                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('gender')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{patient.gender}</p>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('bloodType')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{patient.blood_type}</p>
                                                            </div>                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('birthdate')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{formatBirthdateWithAge(patient.birth_date)}</p>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('emergencyContact')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{patient.emergency_contact}</p>
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="form-label text-muted">{profile('illness')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{patient.illness}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (                                    <div className="text-center py-4">
                                        <i className="fas fa-info-circle text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                        <p className="text-muted mb-0">{profile('noLinkedPatients')}</p>
                                    </div>
                                )
                            ) : userData.patient ? (                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">{profile('gender')}:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.gender}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">{profile('bloodType')}:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.blood_type}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted">{profile('emergencyContact')}:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.emergency_contact}</p>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label text-muted">{profile('illness')}:</label>
                                        <p className="fs-6 fw-medium">{userData.patient.illness}</p>
                                    </div>
                                </div>
                            ) : (                                <div className="text-center py-4">
                                    <i className="fas fa-info-circle text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">{profile('noPatientInfo')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );            case 'family':
                return (
                    <div className="card shadow-sm border-0">                        <div className="card-header bg-info bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-users me-2 text-info"></i>
                                {profile('familyRelationships')}
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.family_relationships && userData.family_relationships.length > 0 ? (
                                <div className="row g-3">
                                    {userData.family_relationships.map((relation, index) => (
                                        <div key={index} className="col-12">
                                            <div className="card bg-light border-0">
                                                <div className="card-body py-3">
                                                    <div className="row">                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('relation')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">{relation.link}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('familyMember')}:</label>
                                                            {relation.user ? (
                                                                <p className="fs-6 fw-medium mb-0">{relation.user.full_name} ({relation.user.email})</p>
                                                            ) : (
                                                                <p className="fs-6 text-muted mb-0">{profile('notAvailable')}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (                                <div className="text-center py-4">
                                    <i className="fas fa-users text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">{profile('noFamilyRelationships')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'medical':
                return (
                    <div className="card shadow-sm border-0">                        <div className="card-header bg-warning bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-folder-medical me-2 text-warning"></i>
                                {profile('medicalFolder')}
                            </h5>
                        </div>
                        <div className="card-body">
                            {userData.medical_folder && userData.medical_folder.length > 0 ? (
                                <div className="row g-3">
                                    {userData.medical_folder.map((record, index) => (
                                        <div key={index} className="col-12">
                                            <div className="card bg-light border-0">
                                                <div className="card-body py-3">
                                                    <div className="row">                                                        <div className="col-md-4">
                                                            <label className="form-label text-muted">{profile('date')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">{record.created_at}</p>
                                                        </div>
                                                        <div className="col-md-8">
                                                            <label className="form-label text-muted">{profile('notes')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">{record.note || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (                                <div className="text-center py-4">
                                    <i className="fas fa-folder-open text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">{profile('noMedicalFolder')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );            case 'contact':
                return (
                    <div className="card shadow-sm border-0">                        <div className="card-header bg-secondary bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-phone me-2 text-secondary"></i>
                                {profile('contactInfo')}
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
                            ) : (                                <div className="text-center py-4">
                                    <i className="fas fa-phone-slash text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">{profile('noContactInfo')}</p>
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
                            <div className="card shadow-sm border-0">                                    <div className="card-body text-center py-5">
                                        <div className="spinner-border text-primary mb-3" role="status">
                                            <span className="visually-hidden">{common('loading')}</span>
                                        </div>
                                        <h5 className="text-muted">{profile('loadingProfile')}</h5>
                                        <p className="text-muted mb-0">{profile('fetchingData')}</p>
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
                        {/* Fixed Profile Header Card */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-primary bg-opacity-10 border-0">
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-user-circle me-3 text-primary" style={{fontSize: '2rem'}}></i>                                    <div>
                                        <h4 className="card-title mb-0">{profile('title')}</h4>                                        <div className="badge bg-primary bg-opacity-20 text-primary mt-1 text-light">
                                            <i className="fas fa-user-tag me-1"></i>
                                            {profile('role')}: {userData.user.role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Draggable Content Area */}
                        <div ref={profileRef} style={{cursor: 'move'}}>
                            {/* Navigation Tabs */}
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-body p-0">
                                    <nav className="nav nav-pills nav-justified">
                                        <button 
                                            className={`nav-link ${selectedTab === 'user' ? 'active' : ''}`}
                                            onClick={() => setSelectedTab('user')}
                                        >                                            <i className="fas fa-user me-2"></i>
                                            {profile('personalInfo')}
                                        </button>
                                        {userData.user.role === 'Family Patient' ? (
                                            <>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'patient' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('patient')}
                                                >
                                                    <i className="fas fa-user-injured me-2"></i>
                                                    {profile('linkedPatients')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'contact' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('contact')}
                                                >
                                                    <i className="fas fa-phone me-2"></i>
                                                    {profile('contactInfo')}
                                                </button>
                                            </>
                                        ) : userData.user.role !== 'Coordinator' && (
                                            <>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'patient' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('patient')}                                                >
                                                    <i className="fas fa-user-injured me-2"></i>
                                                    {profile('medicalInfo')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'family' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('family')}
                                                >
                                                    <i className="fas fa-users me-2"></i>
                                                    {common('family')}
                                                </button>                                                <button 
                                                    className={`nav-link ${selectedTab === 'medical' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('medical')}
                                                >
                                                    <i className="fas fa-folder-medical me-2"></i>
                                                    {profile('medicalFolder')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'contact' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('contact')}
                                                >
                                                    <i className="fas fa-phone me-2"></i>
                                                    {profile('contact')}
                                                </button>
                                            </>
                                        )}
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
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
