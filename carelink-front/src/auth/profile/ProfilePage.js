import React, { useEffect, useState, useRef, useCallback } from 'react';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from '../layout/BaseLayout';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';
import { formatBirthdateWithAge, getAgeDisplay, calculateAge } from '../../utils/ageUtils';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import MedicalFolder from '../../components/MedicalFolder'; // Import MedicalFolder component
import DoctorInfo from '../../components/DoctorInfo'; // Import DoctorInfo component

const ProfilePage = () => {
    // --- All hooks at the top (fixes React error) ---
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);    
    const [selectedTab, setSelectedTab] = useState('user');
    const [linkedPatients, setLinkedPatients] = useState([]);
    const [providerContracts, setProviderContracts] = useState([]);
    const profileRef = useRef(null);
    // Settings tab hooks
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState('');
    const [passwordChangeMsg, setPasswordChangeMsg] = useState('');
    const [passwordChangeError, setPasswordChangeError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    // Login history
    const [loginHistory, setLoginHistory] = useState([]);
    const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
    const [loginHistoryError, setLoginHistoryError] = useState('');
    
    // Contact preferences
    const [preferences, setPreferences] = useState({
        email_notifications: true,
        sms_notifications: false,
        appointment_reminders: true,
        billing_notifications: true,
        medical_alerts: true,
        marketing_communications: false,
        preferred_contact_method: 'email',
        primary_phone_contact: null,
        available_phones: [],
        emergency_contact: {
            name: '',
            phone: '',
            relationship: ''
        }
    });
    const [preferencesLoading, setPreferencesLoading] = useState(false);
    const [preferencesError, setPreferencesError] = useState('');
    const [preferencesMsg, setPreferencesMsg] = useState('');
    const [savingPreferences, setSavingPreferences] = useState(false);
    
    // Phone number management
    const [phoneNumbers, setPhoneNumbers] = useState([]);
    const [phoneLoading, setPhoneLoading] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [showPhoneForm, setShowPhoneForm] = useState(false);
    const [editingPhone, setEditingPhone] = useState(null);
    const [phoneForm, setPhoneForm] = useState({
        phone_number: '',
        name: ''
    });
    
    // Settings tab state
    const [selectedSettingsTab, setSelectedSettingsTab] = useState('security');
    // Use translation hooks
    const { profile, common, auth } = useCareTranslation();
    // Use modern authentication API
    const { get, loading, error: apiError } = useAuthenticatedApi();
    
    // Password strength checker (client-side, simple)
    const checkStrength = (pwd) => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
        if (score <= 2) return 'Weak';
        if (score <= 4) return 'Medium';
        if (score <= 6) return 'Strong';
        return 'Very Strong';
    };

    // Update password strength as user types
    useEffect(() => {
        setPasswordStrength(newPassword ? checkStrength(newPassword) : '');
    }, [newPassword]);

    const handleChangePassword = useCallback(async () => {
        setPasswordChangeMsg('');
        setPasswordChangeError('');
        setChangingPassword(true);
        try {
            const response = await fetch('http://localhost:8000/account/profile/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });
            const data = await response.json();
            if (response.ok) {
                setPasswordChangeMsg(data.message || 'Password changed successfully.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordStrength('');
            } else {
                setPasswordChangeError(data.error || 'Failed to change password.');
            }
        } catch (err) {
            setPasswordChangeError('Network error. Please try again.');
        } finally {
            setChangingPassword(false);
        }
    }, [currentPassword, newPassword, confirmPassword]);

    // Fetch login history and preferences when settings tab is selected
    useEffect(() => {
        if (selectedTab === 'settings') {
            // Fetch login history
            setLoginHistoryLoading(true);
            setLoginHistoryError('');
            fetch('http://localhost:8000/account/profile/login-history/', {
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.login_history) {
                        setLoginHistory(data.login_history);
                    } else {
                        setLoginHistory([]);
                        if (data.error) setLoginHistoryError(data.error);
                    }
                })
                .catch(() => setLoginHistoryError('Failed to load login history.'))
                .finally(() => setLoginHistoryLoading(false));

            // Fetch contact preferences
            setPreferencesLoading(true);
            setPreferencesError('');
            fetch('http://localhost:8000/account/profile/contact-preferences/', {
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        setPreferencesError(data.error);
                    } else {
                        setPreferences(data);
                    }
                })
                .catch(() => setPreferencesError('Failed to load contact preferences.'))
                .finally(() => setPreferencesLoading(false));
        }
    }, [selectedTab]);

    // Save preferences function
    const handleSavePreferences = useCallback(async () => {
        setPreferencesMsg('');
        setPreferencesError('');
        setSavingPreferences(true);
        try {
            const response = await fetch('http://localhost:8000/account/profile/contact-preferences/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`
                },
                body: JSON.stringify({
                    email_notifications: preferences.email_notifications,
                    sms_notifications: preferences.sms_notifications,
                    appointment_reminders: preferences.appointment_reminders,
                    billing_notifications: preferences.billing_notifications,
                    medical_alerts: preferences.medical_alerts,
                    marketing_communications: preferences.marketing_communications,
                    preferred_contact_method: preferences.preferred_contact_method,
                    primary_phone_contact_id: preferences.primary_phone_contact?.id || null,
                    emergency_contact: preferences.emergency_contact
                })
            });
            const data = await response.json();
            if (response.ok) {
                setPreferencesMsg(data.message || 'Preferences saved successfully.');
            } else {
                setPreferencesError(data.error || 'Failed to save preferences.');
            }
        } catch (err) {
            setPreferencesError('Network error. Please try again.');
        } finally {
            setSavingPreferences(false);
        }
    }, [preferences]);

    // Phone number management functions
    const fetchPhoneNumbers = useCallback(async () => {
        console.log('[DEBUG] fetchPhoneNumbers called');
        setPhoneLoading(true);
        setPhoneError('');
        try {
            const token = tokenManager.getAccessToken();
            const response = await fetch('http://localhost:8000/account/phoneuser/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('[DEBUG] Fetched phone numbers from API:', data);
                
                // Extract results array from paginated response
                const phoneNumbersArray = data.results || data;
                console.log('[DEBUG] Setting phone numbers state:', phoneNumbersArray);
                console.log('[DEBUG] Array length:', phoneNumbersArray.length);
                
                // Set phone numbers state directly
                setPhoneNumbers(phoneNumbersArray);
            } else {
                const errorData = await response.json();
                console.error('[DEBUG] Error fetching phone numbers:', errorData);
                setPhoneError(errorData.error || 'Failed to load phone numbers.');
            }
        } catch (err) {
            console.error('[DEBUG] Network error fetching phone numbers:', err);
            setPhoneError('Network error. Please try again.');
        } finally {
            setPhoneLoading(false);
        }
    }, []);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setPhoneError('');
        
        // Validation
        if (!phoneForm.phone_number.trim() || !phoneForm.name.trim()) {
            setPhoneError('Both phone number and description are required.');
            return;
        }
        
        if (phoneNumbers.length >= 3 && !editingPhone) {
            setPhoneError('Maximum 3 phone numbers allowed.');
            return;
        }
        
        try {
            const token = tokenManager.getAccessToken();
            const url = editingPhone 
                ? `http://localhost:8000/account/phoneuser/${editingPhone.id}/`
                : 'http://localhost:8000/account/phoneuser/';
            
            const method = editingPhone ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(phoneForm)
            });
            
            if (response.ok) {
                console.log('[DEBUG] Phone number saved successfully');
                
                // Reset form state
                setShowPhoneForm(false);
                setEditingPhone(null);
                setPhoneForm({ phone_number: '', name: '' });
                setPhoneError('');
                
                // Immediately refresh the phone numbers list
                await fetchPhoneNumbers();
            } else {
                const errorData = await response.json();
                setPhoneError(errorData.error || Object.values(errorData).flat().join(', ') || 'Failed to save phone number.');
            }
        } catch (err) {
            setPhoneError('Network error. Please try again.');
        }
    };

    const handleEditPhone = (phone) => {
        setEditingPhone(phone);
        setPhoneForm({ phone_number: phone.phone_number, name: phone.name });
        setShowPhoneForm(true);
        setPhoneError('');
    };

    const handleDeletePhone = async (phoneId) => {
        if (!confirm('Are you sure you want to delete this phone number?')) return;
        
        try {
            const token = tokenManager.getAccessToken();
            const response = await fetch(`http://localhost:8000/account/phoneuser/${phoneId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                await fetchPhoneNumbers(); // Refresh list
            } else {
                const errorData = await response.json();
                setPhoneError(errorData.error || 'Failed to delete phone number.');
            }
        } catch (err) {
            setPhoneError('Network error. Please try again.');
        }
    };

    const cancelPhoneForm = () => {
        setShowPhoneForm(false);
        setEditingPhone(null);
        setPhoneForm({ phone_number: '', name: '' });
        setPhoneError('');
    };

    // Fetch phone numbers when contact tab is selected
    useEffect(() => {
        if (selectedTab === 'contact') {
            // Always fetch fresh data from API when contact tab is selected
            fetchPhoneNumbers();
        }
    }, [selectedTab, fetchPhoneNumbers]);

    // Debug: Log phoneNumbers state changes
    useEffect(() => {
        console.log('[DEBUG] phoneNumbers state changed:', phoneNumbers);
    }, [phoneNumbers]);

    // --- End hooks ---

    useEffect(() => {
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
                
                // If user is a Provider, fetch their contracts
                if (data.user.role === 'Provider') {
                    console.log('[DEBUG] User is Provider, fetching contracts...');
                    try {
                        const contractsData = await get('http://localhost:8000/account/providers/my-contracts/');
                        console.log('[DEBUG] Provider Contracts Data:', contractsData);
                        setProviderContracts(contractsData.contracts || []);
                    } catch (err) {
                        console.error('[DEBUG] Error fetching provider contracts:', err);
                        // Don't fail the entire profile load if contracts fail
                    }
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
        };        

        fetchProfile();
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
    }, [profileRef]);

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
                                                                <p className="fs-6 fw-medium mb-0">
                                                                    {patient.emergency_contact_name && patient.emergency_contact_phone
                                                                        ? `${patient.emergency_contact_name} (${patient.emergency_contact_relationship || 'Contact'}) - ${patient.emergency_contact_phone}`
                                                                        : 'N/A'}
                                                                </p>
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
                // Get the correct patient ID based on user role
                let medicalPatientId = null;
                
                if (userRole === 'Patient') {
                    // For regular patients, use their own patient profile ID
                    medicalPatientId = userData?.patient?.id || userData?.user?.id;
                } else if (userRole === 'Family Patient') {
                    // For family patients, use the linked patient ID
                    const linkedPatient = userData?.linked_patients?.[0] || userData?.linked_patient;
                    medicalPatientId = linkedPatient?.id;
                } else if (userRole === 'Coordinator') {
                    // Coordinators shouldn't see medical folder tab, but if they do, handle gracefully
                    return (
                        <div className="alert alert-warning">
                            <h4>Access Restricted</h4>
                            <p>Medical folder access is not available for coordinators.</p>
                        </div>
                    );
                }

                console.log('Medical Folder Debug:', {
                    userRole,
                    userData,
                    medicalPatientId,
                    patientId: userData?.patient?.id,
                    linkedPatient: userData?.linked_patient,
                    linkedPatients: userData?.linked_patients
                });

                if (!medicalPatientId) {
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
                        patientId={medicalPatientId}
                        userData={userData}
                        userRole={userRole}
                    />
                );
            case 'doctor':
                // Get the correct patient ID based on user role
                let doctorPatientId = null;
                
                if (userRole === 'Patient') {
                    // For regular patients, use their own patient profile ID
                    doctorPatientId = userData?.patient?.id || userData?.user?.id;
                } else if (userRole === 'Family Patient') {
                    // For family patients, use the linked patient ID
                    const linkedPatient = userData?.linked_patients?.[0] || userData?.linked_patient;
                    doctorPatientId = linkedPatient?.id;
                }

                if (!doctorPatientId) {
                    return (
                        <div className="alert alert-warning">
                            <h4>Doctor Information</h4>
                            <p>Unable to load doctor information. Patient information not found.</p>
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
                    <DoctorInfo 
                        patientId={doctorPatientId}
                        userData={userData}
                        userRole={userRole}
                    />
                );
            case 'contact':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-secondary bg-opacity-10 border-0 d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-phone me-2 text-secondary"></i>
                                Contact Numbers
                            </h5>
                            {phoneNumbers.length < 3 && !showPhoneForm && (
                                <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => setShowPhoneForm(true)}
                                >
                                    <i className="fas fa-plus me-1"></i>
                                    Add Number
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            {phoneError && (
                                <div className="alert alert-danger">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    {phoneError}
                                </div>
                            )}

                            {/* Phone Number Form */}
                            {showPhoneForm && (
                                <div className="card bg-light border mb-3">
                                    <div className="card-body">
                                        <h6 className="card-title">
                                            {editingPhone ? 'Edit Phone Number' : 'Add New Phone Number'}
                                        </h6>
                                        <form onSubmit={handlePhoneSubmit}>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                                                    <input
                                                        type="tel"
                                                        className="form-control"
                                                        value={phoneForm.phone_number}
                                                        onChange={(e) => setPhoneForm({...phoneForm, phone_number: e.target.value})}
                                                        placeholder="e.g., +32 123 456 789"
                                                        required
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">Description <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={phoneForm.name}
                                                        onChange={(e) => setPhoneForm({...phoneForm, name: e.target.value})}
                                                        placeholder="e.g., Mobile Phone, Home Phone"
                                                        maxLength={50}
                                                        required
                                                    />
                                                </div>
                                                <div className="col-12">
                                                    <button type="submit" className="btn btn-primary me-2">
                                                        <i className="fas fa-save me-1"></i>
                                                        {editingPhone ? 'Update' : 'Add'} Phone Number
                                                    </button>
                                                    <button type="button" className="btn btn-secondary" onClick={cancelPhoneForm}>
                                                        <i className="fas fa-times me-1"></i>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Phone Numbers List */}
                            {phoneLoading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                    Loading phone numbers...
                                </div>
                            ) : phoneNumbers.length > 0 ? (
                                <div className="row g-3">{console.log('[DEBUG] Rendering phone numbers list, count:', phoneNumbers.length, 'data:', phoneNumbers)}
                                    {phoneNumbers.map((phone) => (
                                        <div key={phone.id} className="col-md-6">
                                            <div className="card bg-light border-0">
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <label className="form-label text-muted mb-1">{phone.name}</label>
                                                            <p className="fs-6 fw-medium mb-0">{phone.phone_number}</p>
                                                        </div>
                                                        <div className="btn-group btn-group-sm">
                                                            <button 
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => handleEditPhone(phone)}
                                                                title="Edit phone number"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={() => handleDeletePhone(phone.id)}
                                                                title="Delete phone number"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-phone-slash text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-3">No phone numbers added yet</p>
                                    {!showPhoneForm && (
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => setShowPhoneForm(true)}
                                        >
                                            <i className="fas fa-plus me-1"></i>
                                            Add Your First Phone Number
                                        </button>
                                    )}
                                </div>
                            )}

                            {phoneNumbers.length > 0 && phoneNumbers.length < 3 && (
                                <div className="mt-3 text-muted">
                                    <small>
                                        <i className="fas fa-info-circle me-1"></i>
                                        You can add up to {3 - phoneNumbers.length} more phone number{phoneNumbers.length < 2 ? 's' : ''}.
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'contract':
                return (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-info bg-opacity-10 border-0">
                            <h5 className="card-title mb-0">
                                <i className="fas fa-file-contract me-2 text-info"></i>
                                {profile('contractInformation')}
                            </h5>
                        </div>
                        <div className="card-body">
                            {providerContracts && providerContracts.length > 0 ? (
                                <div className="row g-3">
                                    {providerContracts.map((contract, index) => (
                                        <div key={index} className="col-12">
                                            <div className="card bg-light border-0">
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="card-title mb-0">
                                                            {profile('contractReference')} #{contract.contract_reference || contract.id}
                                                        </h6>
                                                        <span className={`badge ${
                                                            contract.status === 'active' ? 'bg-success' :
                                                            contract.status === 'pending' ? 'bg-warning' :
                                                            contract.status === 'inactive' ? 'bg-secondary' :
                                                            'bg-light text-dark'
                                                        }`}>
                                                            {contract.status}
                                                        </span>
                                                    </div>
                                                    <div className="row g-2">
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('contractType')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">{contract.type_contract}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('service')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">{contract.service_name || 'N/A'}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('startDate')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">
                                                                {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label text-muted">{profile('endDate')}:</label>
                                                            <p className="fs-6 fw-medium mb-0">
                                                                {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                        {contract.weekly_hours && (
                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('weeklyHours')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{contract.weekly_hours}h</p>
                                                            </div>
                                                        )}
                                                        {contract.hourly_rate && (
                                                            <div className="col-md-6">
                                                                <label className="form-label text-muted">{profile('hourlyRate')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">€{contract.hourly_rate}</p>
                                                            </div>
                                                        )}
                                                        {contract.department && (
                                                            <div className="col-12">
                                                                <label className="form-label text-muted">{profile('department')}:</label>
                                                                <p className="fs-6 fw-medium mb-0">{contract.department}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-file-contract text-muted mb-2" style={{fontSize: '2rem'}}></i>
                                    <p className="text-muted mb-0">{profile('noContractsFound')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="settings-container">
                        {/* Settings Header */}
                        <div className="settings-header mb-4">
                            <div className="d-flex align-items-center mb-3">
                                <div className="settings-icon me-3">
                                    <i className="fas fa-cog"></i>
                                </div>
                                <div>
                                    <h4 className="mb-1">{profile('settings') || 'Settings'}</h4>
                                    <p className="text-muted mb-0">Manage your account preferences and security</p>
                                </div>
                            </div>
                        </div>

                        {/* Settings Tabs Navigation */}
                        <div className="settings-nav mb-4">
                            <nav className="nav nav-pills nav-fill">
                                <button 
                                    className={`nav-link ${selectedSettingsTab === 'security' ? 'active' : ''}`}
                                    onClick={() => setSelectedSettingsTab('security')}
                                >
                                    <i className="fas fa-shield-alt me-2"></i>
                                    Security
                                </button>
                                <button 
                                    className={`nav-link ${selectedSettingsTab === 'preferences' ? 'active' : ''}`}
                                    onClick={() => setSelectedSettingsTab('preferences')}
                                >
                                    <i className="fas fa-bell me-2"></i>
                                    Preferences
                                </button>
                                <button 
                                    className={`nav-link ${selectedSettingsTab === 'account' ? 'active' : ''}`}
                                    onClick={() => setSelectedSettingsTab('account')}
                                >
                                    <i className="fas fa-user-cog me-2"></i>
                                    Account
                                </button>
                            </nav>
                        </div>

                        {/* Settings Content */}
                        <div className="settings-content">
                            {selectedSettingsTab === 'security' && (
                                <div className="settings-section fade-in">
                                    {/* Change Password Card */}
                                    <div className="settings-card mb-4">
                                        <div className="settings-card-header">
                                            <div className="d-flex align-items-center">
                                                <div className="icon-circle bg-primary bg-opacity-10 text-primary me-3">
                                                    <i className="fas fa-key"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1">{profile('changePassword')}</h6>
                                                    <small className="text-muted">Update your account password</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="settings-card-body">
                                            <form onSubmit={e => { e.preventDefault(); handleChangePassword(); }}>
                                                <div className="password-form">
                                                    <div className="form-floating mb-3">
                                                        <input 
                                                            type="password" 
                                                            className="form-control" 
                                                            id="currentPassword"
                                                            placeholder={profile('currentPassword')} 
                                                            value={currentPassword} 
                                                            onChange={e => setCurrentPassword(e.target.value)} 
                                                            autoComplete="current-password" 
                                                        />
                                                        <label htmlFor="currentPassword">{profile('currentPassword')}</label>
                                                    </div>
                                                    <div className="row g-3">
                                                        <div className="col-md-6">
                                                            <div className="form-floating">
                                                                <input 
                                                                    type="password" 
                                                                    className="form-control" 
                                                                    id="newPassword"
                                                                    placeholder={profile('newPassword')} 
                                                                    value={newPassword} 
                                                                    onChange={e => setNewPassword(e.target.value)} 
                                                                    autoComplete="new-password" 
                                                                />
                                                                <label htmlFor="newPassword">{profile('newPassword')}</label>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="form-floating">
                                                                <input 
                                                                    type="password" 
                                                                    className="form-control" 
                                                                    id="confirmPassword"
                                                                    placeholder={profile('confirmNewPassword')} 
                                                                    value={confirmPassword} 
                                                                    onChange={e => setConfirmPassword(e.target.value)} 
                                                                    autoComplete="new-password" 
                                                                />
                                                                <label htmlFor="confirmPassword">{profile('confirmNewPassword')}</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {passwordStrength && (
                                                        <div className="password-strength mt-3">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <small className="text-muted">{profile('passwordStrength')}</small>
                                                                <span className={`badge ${passwordStrength === 'Weak' ? 'bg-danger' : passwordStrength === 'Medium' ? 'bg-warning' : passwordStrength === 'Strong' ? 'bg-info' : 'bg-success'}`}>
                                                                    {passwordStrength}
                                                                </span>
                                                            </div>
                                                            <div className="progress" style={{height: '4px'}}>
                                                                <div 
                                                                    className={`progress-bar ${passwordStrength === 'Weak' ? 'bg-danger' : passwordStrength === 'Medium' ? 'bg-warning' : passwordStrength === 'Strong' ? 'bg-info' : 'bg-success'}`}
                                                                    style={{width: passwordStrength === 'Weak' ? '25%' : passwordStrength === 'Medium' ? '50%' : passwordStrength === 'Strong' ? '75%' : '100%'}}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {passwordChangeMsg && (
                                                        <div className="alert alert-success d-flex align-items-center mt-3">
                                                            <i className="fas fa-check-circle me-2"></i>
                                                            {passwordChangeMsg}
                                                        </div>
                                                    )}
                                                    {passwordChangeError && (
                                                        <div className="alert alert-danger d-flex align-items-center mt-3">
                                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                                            {passwordChangeError}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="d-flex justify-content-end mt-4">
                                                        <button type="submit" className="btn btn-primary px-4" disabled={changingPassword}>
                                                            {changingPassword ? (
                                                                <>
                                                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                                    {profile('savingPreferences')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-save me-2"></i>
                                                                    {profile('changePassword')}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                    
                                    {/* Login History Card */}
                                    <div className="settings-card">
                                        <div className="settings-card-header">
                                            <div className="d-flex align-items-center">
                                                <div className="icon-circle bg-info bg-opacity-10 text-info me-3">
                                                    <i className="fas fa-history"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1">{profile('loginHistory')}</h6>
                                                    <small className="text-muted">Recent login activity</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="settings-card-body">
                                            {loginHistoryLoading ? (
                                                <div className="text-center py-4">
                                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                    Loading...
                                                </div>
                                            ) : loginHistoryError ? (
                                                <div className="alert alert-warning">
                                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                                    {loginHistoryError}
                                                </div>
                                            ) : loginHistory.length === 0 ? (
                                                <div className="text-center py-4 text-muted">
                                                    <i className="fas fa-info-circle mb-2 d-block" style={{fontSize: '2rem'}}></i>
                                                    No login history available
                                                </div>
                                            ) : (
                                                <div className="login-history-list">
                                                    {loginHistory.slice(0, 5).map((log, idx) => (
                                                        <div key={idx} className="login-history-item">
                                                            <div className="d-flex align-items-center">
                                                                <div className="login-icon me-3">
                                                                    <i className={`fas fa-${log.success ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="fw-medium">{new Date(log.timestamp).toLocaleDateString()}</div>
                                                                    <small className="text-muted d-block">{new Date(log.timestamp).toLocaleTimeString()}</small>
                                                                    <small className="text-muted">
                                                                        User: {log.user_name || log.user_email || 'Current User'}
                                                                    </small>
                                                                </div>
                                                                <div className="text-end">
                                                                    {log.user_agent && log.user_agent !== 'Not available' && (
                                                                        <small className="text-muted d-block">{log.user_agent.substring(0, 30)}...</small>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {loginHistory.length > 5 && (
                                                        <div className="text-center mt-3">
                                                            <small className="text-muted">Showing 5 of {loginHistory.length} entries</small>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {selectedSettingsTab === 'preferences' && (
                                <div className="settings-section fade-in">
                                    {/* Contact Preferences Card */}
                                    <div className="settings-card">
                                        <div className="settings-card-header">
                                            <div className="d-flex align-items-center">
                                                <div className="icon-circle bg-success bg-opacity-10 text-success me-3">
                                                    <i className="fas fa-bell"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1">{profile('contactPreferences')}</h6>
                                                    <small className="text-muted">Manage your notification and contact preferences</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="settings-card-body">
                                            {preferencesLoading ? (
                                                <div className="text-center py-4">
                                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                    {profile('preferencesLoading')}
                                                </div>
                                            ) : (
                                                <form onSubmit={(e) => e.preventDefault()}>
                                                    <div className="preferences-grid">
                                                        {/* Notification Preferences */}
                                                        <div className="preference-section">
                                                            <h6 className="preference-section-title">
                                                                <i className="fas fa-bell me-2"></i>
                                                                {profile('notificationTypes')}
                                                            </h6>
                                                            <div className="preference-switches">
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="emailNotifications"
                                                                            checked={preferences.email_notifications}
                                                                            onChange={(e) => setPreferences({...preferences, email_notifications: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="emailNotifications">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-envelope text-primary me-2"></i>
                                                                                <span>{profile('emailNotifications')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Receive notifications via email</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="smsNotifications"
                                                                            checked={preferences.sms_notifications}
                                                                            onChange={(e) => setPreferences({...preferences, sms_notifications: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="smsNotifications">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-sms text-info me-2"></i>
                                                                                <span>{profile('smsNotifications')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Receive notifications via SMS</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="appointmentReminders"
                                                                            checked={preferences.appointment_reminders}
                                                                            onChange={(e) => setPreferences({...preferences, appointment_reminders: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="appointmentReminders">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-calendar text-warning me-2"></i>
                                                                                <span>{profile('appointmentReminders')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Get reminders for upcoming appointments</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="billingNotifications"
                                                                            checked={preferences.billing_notifications}
                                                                            onChange={(e) => setPreferences({...preferences, billing_notifications: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="billingNotifications">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-file-invoice text-success me-2"></i>
                                                                                <span>{profile('billingNotifications')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Receive billing and payment notifications</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="medicalAlerts"
                                                                            checked={preferences.medical_alerts}
                                                                            onChange={(e) => setPreferences({...preferences, medical_alerts: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="medicalAlerts">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-heartbeat text-danger me-2"></i>
                                                                                <span>{profile('medicalAlerts')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Important medical notifications and alerts</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="preference-item">
                                                                    <div className="form-check form-switch">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            id="marketingCommunications"
                                                                            checked={preferences.marketing_communications}
                                                                            onChange={(e) => setPreferences({...preferences, marketing_communications: e.target.checked})}
                                                                        />
                                                                        <label className="form-check-label" htmlFor="marketingCommunications">
                                                                            <div className="preference-label">
                                                                                <i className="fas fa-bullhorn text-secondary me-2"></i>
                                                                                <span>{profile('marketingCommunications')}</span>
                                                                            </div>
                                                                            <small className="text-muted">Marketing updates and promotional content</small>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Contact Method Preferences */}
                                                        <div className="preference-section">
                                                            <h6 className="preference-section-title">
                                                                <i className="fas fa-phone me-2"></i>
                                                                {profile('contactPreferencesTitle')}
                                                            </h6>
                                                            
                                                            <div className="contact-methods">
                                                                <div className="form-floating mb-3">
                                                                    <select 
                                                                        className="form-select"
                                                                        id="preferredContactMethod"
                                                                        value={preferences.preferred_contact_method}
                                                                        onChange={(e) => setPreferences({...preferences, preferred_contact_method: e.target.value})}
                                                                    >
                                                                        <option value="email">📧 Email</option>
                                                                        <option value="phone">📞 Phone</option>
                                                                        <option value="sms">💬 SMS</option>
                                                                    </select>
                                                                    <label htmlFor="preferredContactMethod">{profile('preferredContactMethod')}</label>
                                                                </div>
                                                                
                                                                {preferences.available_phones && preferences.available_phones.length > 0 && (
                                                                    <div className="form-floating mb-3">
                                                                        <select 
                                                                            className="form-select"
                                                                            id="primaryPhoneContact"
                                                                            value={preferences.primary_phone_contact?.id || ''}
                                                                            onChange={(e) => {
                                                                                const phoneId = e.target.value;
                                                                                const selectedPhone = preferences.available_phones.find(p => p.id.toString() === phoneId);
                                                                                setPreferences({...preferences, primary_phone_contact: selectedPhone || null});
                                                                            }}
                                                                        >
                                                                            <option value="">{profile('noPrimaryPhone')}</option>
                                                                            {preferences.available_phones.map(phone => (
                                                                                <option key={phone.id} value={phone.id}>
                                                                                    📱 {phone.phone_number} ({phone.name})
                                                                                    {phone.is_primary ? ' - Primary' : ''}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        <label htmlFor="primaryPhoneContact">{profile('primaryPhoneContact')}</label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Emergency Contact */}
                                                        <div className="preference-section">
                                                            <h6 className="preference-section-title">
                                                                <i className="fas fa-user-shield me-2"></i>
                                                                {profile('emergencyContactTitle')}
                                                            </h6>
                                                            
                                                            <div className="emergency-contact-form">
                                                                <div className="row g-3">
                                                                    <div className="col-md-6">
                                                                        <div className="form-floating">
                                                                            <input 
                                                                                type="text" 
                                                                                className="form-control"
                                                                                id="emergencyContactName"
                                                                                value={preferences.emergency_contact.name}
                                                                                onChange={(e) => setPreferences({
                                                                                    ...preferences, 
                                                                                    emergency_contact: {
                                                                                        ...preferences.emergency_contact,
                                                                                        name: e.target.value
                                                                                    }
                                                                                })}
                                                                                placeholder={profile('emergencyContactNamePlaceholder')}
                                                                            />
                                                                            <label htmlFor="emergencyContactName">{profile('emergencyContactName')}</label>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">
                                                                        <div className="form-floating">
                                                                            <input 
                                                                                type="tel" 
                                                                                className="form-control"
                                                                                id="emergencyContactPhone"
                                                                                value={preferences.emergency_contact.phone}
                                                                                onChange={(e) => setPreferences({
                                                                                    ...preferences, 
                                                                                    emergency_contact: {
                                                                                        ...preferences.emergency_contact,
                                                                                        phone: e.target.value
                                                                                    }
                                                                                })}
                                                                                placeholder={profile('emergencyContactPhonePlaceholder')}
                                                                            />
                                                                            <label htmlFor="emergencyContactPhone">{profile('emergencyContactPhone')}</label>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <div className="form-floating">
                                                                            <input 
                                                                                type="text" 
                                                                                className="form-control"
                                                                                id="emergencyContactRelationship"
                                                                                value={preferences.emergency_contact.relationship}
                                                                                onChange={(e) => setPreferences({
                                                                                    ...preferences, 
                                                                                    emergency_contact: {
                                                                                        ...preferences.emergency_contact,
                                                                                        relationship: e.target.value
                                                                                    }
                                                                                })}
                                                                                placeholder={profile('emergencyContactRelationshipPlaceholder')}
                                                                            />
                                                                            <label htmlFor="emergencyContactRelationship">{profile('emergencyContactRelationship')}</label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Messages */}
                                                    {preferencesMsg && (
                                                        <div className="alert alert-success d-flex align-items-center mb-3">
                                                            <i className="fas fa-check-circle me-2"></i>
                                                            {preferencesMsg}
                                                        </div>
                                                    )}
                                                    {preferencesError && (
                                                        <div className="alert alert-danger d-flex align-items-center mb-3">
                                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                                            {preferencesError}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="d-flex justify-content-end">
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-primary px-4"
                                                            onClick={handleSavePreferences}
                                                            disabled={savingPreferences}
                                                        >
                                                            {savingPreferences ? (
                                                                <>
                                                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                                    {profile('savingPreferences')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="fas fa-save me-2"></i>
                                                                    {profile('savePreferences')}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedSettingsTab === 'account' && (
                                <div className="settings-section fade-in">
                                    {/* Account Deletion Card */}
                                    <div className="settings-card">
                                        <div className="settings-card-header">
                                            <div className="d-flex align-items-center">
                                                <div className="icon-circle bg-danger bg-opacity-10 text-danger me-3">
                                                    <i className="fas fa-user-slash"></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1 text-danger">{profile('deleteAccountTitle')}</h6>
                                                    <small className="text-muted">Permanently delete your account and data</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="settings-card-body">
                                            <div className="alert alert-warning d-flex align-items-start">
                                                <i className="fas fa-exclamation-triangle me-3 mt-1"></i>
                                                <div>
                                                    <h6 className="alert-heading">Warning: This action cannot be undone</h6>
                                                    <p className="mb-0">
                                                        Deleting your account will permanently remove all your data, including medical records, 
                                                        appointments, and personal information. This action is irreversible.
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <form onSubmit={(e) => e.preventDefault()}>
                                                <div className="mb-3">
                                                    <label htmlFor="deletionReason" className="form-label">{profile('deleteAccountReason')}</label>
                                                    <textarea 
                                                        className="form-control" 
                                                        id="deletionReason"
                                                        rows="3"
                                                        placeholder="Please let us know why you're leaving (optional)"
                                                    ></textarea>
                                                </div>
                                                
                                                <div className="form-check mb-4">
                                                    <input 
                                                        className="form-check-input" 
                                                        type="checkbox" 
                                                        id="confirmDeletion"
                                                    />
                                                    <label className="form-check-label" htmlFor="confirmDeletion">
                                                        <strong>{profile('confirmDeleteAccount')}</strong>
                                                    </label>
                                                </div>
                                                
                                                <div className="d-flex justify-content-end gap-3">
                                                    <button type="button" className="btn btn-outline-secondary px-4">
                                                        <i className="fas fa-times me-2"></i>
                                                        Cancel
                                                    </button>
                                                    <button type="button" className="btn btn-danger px-4">
                                                        <i className="fas fa-trash me-2"></i>
                                                        {profile('requestAccountDeletion')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
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
    }

    return (
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
                                        ) : userData.user.role === 'Provider' ? (
                                            <>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'contract' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('contract')}
                                                >
                                                    <i className="fas fa-file-contract me-2"></i>
                                                    {profile('contract')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'contact' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('contact')}
                                                >
                                                    <i className="fas fa-phone me-2"></i>
                                                    {profile('contactInfo')}
                                                </button>
                                            </>
                                        ) : userData.user.role !== 'Coordinator' && userData.user.role && userData.user.role !== 'null' && userData.user.role !== 'undefined' && (
                                            <>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'patient' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('patient')}
                                                >
                                                    <i className="fas fa-user-injured me-2"></i>
                                                    {profile('medicalInfo')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'family' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('family')}
                                                >
                                                    <i className="fas fa-users me-2"></i>
                                                    {common('family')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'medical' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('medical')}
                                                >
                                                    <i className="fas fa-folder-medical me-2"></i>
                                                    {profile('medicalFolder')}
                                                </button>
                                                <button 
                                                    className={`nav-link ${selectedTab === 'doctor' ? 'active' : ''}`}
                                                    onClick={() => setSelectedTab('doctor')}
                                                >
                                                    <i className="fas fa-user-md me-2"></i>
                                                    {profile('doctorInfo')}
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
                                        <button className={`nav-link ${selectedTab === 'settings' ? 'active' : ''}`} onClick={() => setSelectedTab('settings')}>
                                            <i className="fas fa-cog me-2"></i>
                                            {profile('settings') || 'Settings'}
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
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;

