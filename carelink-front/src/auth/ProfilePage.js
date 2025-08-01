import React, { useEffect, useState, useRef } from 'react';
import './profile/ProfilePage.css';  // Keep profile-specific styles
import BaseLayout from './layout/BaseLayout';
import { useAuthenticatedApi } from '../hooks/useAuth';
import tokenManager from '../utils/tokenManager';
import { formatBirthdateWithAge, getAgeDisplay, calculateAge } from '../utils/ageUtils';
import { useCareTranslation } from '../hooks/useTranslation';
import MedicalFolder from '../components/MedicalFolder'; // Import MedicalFolder component

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('user');
    const profileRef = useRef(null);
    
    // Use modern authentication API
    const { get, loading, error: apiError } = useAuthenticatedApi();
    const { profile, common, auth } = useCareTranslation();
    
    useEffect(() => {
        const fetchProfile = async () => {
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
                console.log('[DEBUG] Family Data:', data.family_relationships);
                setUserData(data);
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
    }, []); // Remove get dependency to prevent infinite re-fetching

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
    }, [profileRef]);    // Filter tabs based on user role
    const getAvailableTabs = () => {
        const userRole = userData?.user?.role;
        
        // Base tabs that all authenticated users can see
        const baseTabs = [
            { id: 'user', label: 'User Information', icon: '👤' }
        ];
        
        // If user has no role or role is null/undefined, only show user information
        if (!userRole || userRole === 'null' || userRole === 'undefined') {
            return baseTabs;
        }
        
        // Additional tabs for users with roles
        const additionalTabs = [];
        
        // Patient information for patients and healthcare providers
        if (['Patient', 'Provider', 'Family Patient'].includes(userRole)) {
            additionalTabs.push({ id: 'patient', label: 'Patient Information', icon: '🏥' });
        }
        
        // Family information for family patients
        if (userRole === 'Family Patient') {
            additionalTabs.push({ id: 'family', label: 'Family Information', icon: '👨‍👩‍👧‍👦' });
        }
        
        // Medical folder for patients
        if (['Patient', 'Family Patient'].includes(userRole)) {
            additionalTabs.push({ id: 'folder', label: 'Medical Folder', icon: '📁' });
        }
        

        
        // Contact information for all users with roles
        if (userRole) {
            additionalTabs.push({ id: 'contact', label: 'Contact Information', icon: '📞' });
        }
        
        return [...baseTabs, ...additionalTabs];
    };

    const availableTabs = getAvailableTabs();
    


    // Ensure selected tab is valid for current user
    useEffect(() => {
        const validTabIds = availableTabs.map(tab => tab.id);
        if (!validTabIds.includes(selectedTab)) {
            setSelectedTab('user');
        }
    }, [userData?.user?.role, selectedTab, availableTabs]);

    const renderContent = () => {
        const userRole = userData?.user?.role;
        
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
                                <div className="col-md-6">
                                    <label className="form-label text-muted">Role:</label>
                                    <p className="fs-6 fw-medium">
                                        {userRole && userRole !== 'null' && userRole !== 'undefined' ? userRole : (
                                            <span className="text-muted fst-italic">
                                                {profile('noRoleAssigned')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Show translatable message for users without roles */}
                            {(!userRole || userRole === 'null' || userRole === 'undefined') && (
                                <div className="alert alert-info mt-3" role="alert">
                                    <div className="d-flex align-items-start">
                                        <i className="fas fa-info-circle me-2 mt-1" style={{color: '#0dcaf0'}}></i>
                                        <div>
                                            <h6 className="alert-heading mb-1">{profile('roleAssignmentRequired')}</h6>
                                            <p className="mb-0">
                                                {profile('roleAssignmentMessage')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            
            // Only show other cases if user has proper role
            case 'folder':
                // Get the correct patient ID based on user role
                let folderPatientId = null;
                
                if (userRole === 'Patient') {
                    // For regular patients, use their own patient profile ID
                    folderPatientId = userData?.patient?.id || userData?.user?.id;
                } else if (userRole === 'Family Patient') {
                    // For family patients, use the linked patient ID
                    const linkedPatient = userData?.linked_patients?.[0] || userData?.linked_patient;
                    folderPatientId = linkedPatient?.id;
                } else if (userRole === 'Coordinator') {
                    // Coordinators shouldn't see medical folder tab, but if they do, handle gracefully
                    return (
                        <div className="alert alert-warning">
                            <h4>Access Restricted</h4>
                            <p>Medical folder access is not available for coordinators.</p>
                        </div>
                    );
                }

                if (!folderPatientId) {
                    return (
                        <div className="alert alert-warning">
                            <h4>Medical Folder</h4>
                            <p>Unable to load medical folder. Patient information not found.</p>
                            <p><strong>Debug Info:</strong></p>
                            <ul>
                                <li>User Role: {userRole}</li>
                                <li>User ID: {userData?.user?.id}</li>
                                <li>Patient ID: {userData?.patient?.id}</li>
                                <li>Linked Patient: {JSON.stringify(userData?.linked_patient || userData?.linked_patients?.[0])}</li>
                            </ul>
                        </div>
                    );
                }

                return (
                    <MedicalFolder 
                        patientId={folderPatientId}
                        userData={userData}
                        userRole={userRole}
                    />
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
                return (
                    <div className="alert alert-info">
                        <h4>Profile Information</h4>
                        <p>Select a tab to view your profile information.</p>
                    </div>
                );
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
            <div className="profile-page">
                <div className="container-fluid py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-10 col-xl-8">
                            {/* Profile Header Card */}
                            <div className="card shadow-sm border-0 mb-4" ref={profileRef} style={{cursor: 'move'}}>
                                <div className="card-header bg-primary bg-opacity-10 border-0">
                                    <div className="d-flex align-items-center">
                                        <i className="fas fa-user-circle me-3 text-primary" style={{fontSize: '2rem'}}></i>
                                        <div>
                                            <h4 className="card-title mb-0">Profile Information</h4>                                            <div className="badge bg-primary bg-opacity-20 text-primary mt-1">
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
                                        {availableTabs.map((tab) => (
                                            <button 
                                                key={tab.id}
                                                className={`nav-link ${selectedTab === tab.id ? 'active' : ''}`}
                                                onClick={() => setSelectedTab(tab.id)}
                                            >
                                                <span className="me-2">{tab.icon}</span>
                                                {tab.label}
                                            </button>
                                        ))}
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
