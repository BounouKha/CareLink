import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import BaseLayout from '../layout/BaseLayout';
import LeftToolbar from '../layout/LeftToolbar';

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);    const [selectedTab, setSelectedTab] = useState('user');
    const [linkedPatients, setLinkedPatients] = useState([]);
    const profileRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            console.log('[DEBUG] Starting profile data fetch');
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
                }                const data = await response.json();
                console.log('[DEBUG] Fetched Profile Data:', data); // Debugging fetched data
                setUserData(data);
                  // If user is a Family Patient, fetch linked patient info
                if (data.user.role === 'Family Patient') {
                    try {
                        const linkedResponse = await fetch('http://localhost:8000/account/family-patient/linked-patient/', {
                            method: 'GET',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        if (linkedResponse.ok) {
                            const linkedData = await linkedResponse.json();
                            console.log('[DEBUG] Linked Patients Data:', linkedData);
                            // Handle both old (linked_patient) and new (linked_patients) API format
                            if (linkedData.linked_patients && Array.isArray(linkedData.linked_patients)) {
                                setLinkedPatients(linkedData.linked_patients);
                            } else if (linkedData.linked_patient) {
                                // Fallback for old API format
                                setLinkedPatients([linkedData.linked_patient]);
                            } else {
                                setLinkedPatients([]);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching linked patients:', err);
                    }
                }
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
    }, [profileRef]);

    const renderContent = () => {
        switch (selectedTab) {
            case 'user':
                return (
                    <div className="user-info">
                        <h2>User Information</h2>
                        <p><strong>Email:</strong> {userData.user.email}</p>
                        <p><strong>First Name:</strong> {userData.user.firstname}</p>
                        <p><strong>Last Name:</strong> {userData.user.lastname}</p>
                        <p><strong>Address:</strong> {userData.user.address}</p>
                        {userData.user.national_number && userData.user.national_number !== "null" && (
                            <p><strong>National Number:</strong> {userData.user.national_number}</p>                        )}
                        <p><strong>Birthdate:</strong> {userData.user.birthdate}</p>
                    </div>
                );            case 'patient':
                return (
                    <div className="patient-info">
                        <h2>{userData.user.role === 'Family Patient' ? "Linked Patient Information" : "Patient Information"}</h2>
                        {userData.user.role === 'Family Patient' ? (
                            linkedPatients && linkedPatients.length > 0 ? (
                                <div className="linked-patients-container">
                                    {linkedPatients.map((patient, index) => (
                                        <div key={index} className="patient-card">
                                            <div className="patient-header">
                                                <h3>{patient.firstname} {patient.lastname}</h3>
                                                <span className="relationship-badge">{patient.relationship || 'Family Member'}</span>
                                            </div>
                                            <div className="patient-details">
                                                <p><strong>Gender:</strong> {patient.gender}</p>
                                                <p><strong>Blood Type:</strong> {patient.blood_type}</p>
                                                <p><strong>Emergency Contact:</strong> {patient.emergency_contact}</p>
                                                <p><strong>Illness:</strong> {patient.illness}</p>
                                                <p><strong>Birth Date:</strong> {patient.birth_date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No linked patient information available.</p>
                            )
                        ) : userData.patient ? (
                            <div>
                                <p><strong>Gender:</strong> {userData.patient.gender}</p>
                                <p><strong>Blood Type:</strong> {userData.patient.blood_type}</p>
                                <p><strong>Emergency Contact:</strong> {userData.patient.emergency_contact}</p>
                                <p><strong>Illness:</strong> {userData.patient.illness}</p>
                            </div>
                        ) : (
                            <p>No patient information available.</p>
                        )}
                    </div>
                );
            case 'family':
                return (
                    <div className="family-info">
                        <h2>Family Relationships</h2>
                        {userData.family_relationships && userData.family_relationships.length > 0 ? (
                            <ul>
                                {userData.family_relationships.map((relation, index) => (
                                    <li key={index}>
                                        <p><strong>Relation:</strong> {relation.link}</p>
                                        {relation.user ? (
                                            <p><strong>Family Member:</strong> {relation.user.full_name} ({relation.user.email})</p>
                                        ) : (
                                            <p><strong>Family Member:</strong> Not Available</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No family relationships available.</p>
                        )}
                    </div>
                );
            case 'medical':
                return (
                    <div className="medical-folder">
                        <h2>Medical Folder</h2>
                        {userData.medical_folder && userData.medical_folder.length > 0 ? (
                            <ul>
                                {userData.medical_folder.map((record, index) => (
                                    <li key={index}>
                                        <p><strong>Date:</strong> {record.created_at}</p>
                                        <p><strong>Notes:</strong> {record.note || 'N/A'}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No medical folder data available.</p>
                        )}
                    </div>
                );
            case 'contact':
                return (
                    <div className="contact-info">
                        <h2>Contact Information</h2>
                        {userData.phone_numbers && userData.phone_numbers.length > 0 ? (
                            <ul>
                                {userData.phone_numbers.map((phone, index) => (
                                    <li key={index}>
                                        <p><strong>{phone.name}</strong> {phone.phone_number}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No contact information available.</p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };


    if (error) {
        return <BaseLayout><div className="error">{error}</div></BaseLayout>;
    }

    if (!userData) {
        return <BaseLayout><div>Loading...</div></BaseLayout>;
    }

    return (
        <BaseLayout>
            <LeftToolbar userData={userData} />
            <div className="profile-container" ref={profileRef}>
                <div className="role-display">
                    <p><strong>Role:</strong> {userData.user.role}</p>
                </div>                <div className="toolbar">
                    <button onClick={() => setSelectedTab('user')} className={selectedTab === 'user' ? 'active' : ''}>User Info</button>
                    {userData.user.role === 'Family Patient' ? (
                        <>
                            <button onClick={() => setSelectedTab('patient')} className={selectedTab === 'patient' ? 'active' : ''}>Linked Patients</button>
                            <button onClick={() => setSelectedTab('family')} className={selectedTab === 'family' ? 'active' : ''}>Family</button>
                            <button onClick={() => setSelectedTab('contact')} className={selectedTab === 'contact' ? 'active' : ''}>Contact</button>
                        </>
                    ) : userData.user.role !== 'Coordinator' && (
                        <>
                            <button onClick={() => setSelectedTab('patient')} className={selectedTab === 'patient' ? 'active' : ''}>Patient Info</button>
                            <button onClick={() => setSelectedTab('family')} className={selectedTab === 'family' ? 'active' : ''}>Family</button>
                            <button onClick={() => setSelectedTab('medical')} className={selectedTab === 'medical' ? 'active' : ''}>Medical Folder</button>
                            <button onClick={() => setSelectedTab('contact')} className={selectedTab === 'contact' ? 'active' : ''}>Contact</button>
                        </>
                    )}
                </div>
                <div className="profile-content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
