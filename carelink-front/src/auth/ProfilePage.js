import React, { useEffect, useState, useRef } from 'react';
import './ProfilePage.css';
import BaseLayout from './BaseLayout';

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState(null);
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

    if (error) {
        return <BaseLayout><div className="error">{error}</div></BaseLayout>;
    }

    if (!userData) {
        return <BaseLayout><div>Loading...</div></BaseLayout>;
    }

    console.log(userData);

    return (
        <BaseLayout>
            <div className="profile-title">Profile</div>
            <div className="profile-container" ref={profileRef}>
                {/* <h1>Profile</h1> */}
                <div className="role-display">
                    <p><strong>{userData.user.role}</strong> </p>
                </div>
            </div>
            <div className="profile-page">
                <div className="profile-info">
                    {/* User Information */}
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

                    {/* Patient Information */}
                    {userData.patient && (
                        <div className="profile-info patient-profile-info">
                            <h2>Patient Information</h2>
                            <p><strong>Gender:</strong> {userData.patient.gender}</p>
                            <p><strong>Blood Type:</strong> {userData.patient.blood_type}</p>
                            <p><strong>Emergency Contact:</strong> {userData.patient.emergency_contact}</p>
                            <p><strong>Illness:</strong> {userData.patient.illness}</p>
                            <p><strong>Medication:</strong> {userData.patient.medication}</p>
                            <p><strong>Social Price:</strong> {userData.patient.social_price ? 'Yes' : 'No'}</p>
                        </div>
                    )}

                    {/* Family Relationships */}
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
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
