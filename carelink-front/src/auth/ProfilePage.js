import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import BaseLayout from './BaseLayout';

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('user');
    const profileRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                console.log('[DEBUG] Token:', token);
                const response = await fetch('http://localhost:8000/account/profile/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile data.');
                }

                const data = await response.json();
                console.log('[DEBUG] Fetched Profile Data:', data); // Debugging fetched data
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
                            <p><strong>National Number:</strong> {userData.user.national_number}</p>
                        )}
                        <p><strong>Birthdate:</strong> {userData.user.birthdate}</p>
                    </div>
                );
            case 'patient':
                return (
                    <div className="patient-info">
                        <h2>Patient Information</h2>
                        {userData.patient ? (
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
                        {userData.family && userData.family.length > 0 ? (
                            <ul>
                                {userData.family.map((relation, index) => (
                                    <li key={index}>
                                        <p><strong>Relation:</strong> {relation.link}</p>
                                        <p><strong>Family Member (User ID):</strong> {relation.user_id}</p>
                                        <p><strong>Patient (Patient ID):</strong> {relation.patient_id}</p>
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
            <div className="profile-title">Profile</div>
            <div className="profile-container" ref={profileRef}>
                <div className="role-display">
                    <p><strong>Role:</strong> {userData.user.role}</p>
                </div>
                <div className="toolbar">
                    <button onClick={() => setSelectedTab('user')} className={selectedTab === 'user' ? 'active' : ''}>User Info</button>
                    <button onClick={() => setSelectedTab('patient')} className={selectedTab === 'patient' ? 'active' : ''}>Patient Info</button>
                    <button onClick={() => setSelectedTab('family')} className={selectedTab === 'family' ? 'active' : ''}>Family</button>
                    <button onClick={() => setSelectedTab('medical')} className={selectedTab === 'medical' ? 'active' : ''}>Medical Folder</button>
                    <button onClick={() => setSelectedTab('contact')} className={selectedTab === 'contact' ? 'active' : ''}>Contact</button>
                </div>
                <div className="profile-content">
                    {renderContent()}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
