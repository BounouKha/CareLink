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

    return (
        <BaseLayout>
            <div className="profile-container" ref={profileRef}>
                <h1>Profile</h1>
            </div>
            <div className="profile-page">
                <div className="profile-info">
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
                    <div className="phone-info">
                        <h2>Phone Numbers</h2>
                        {userData.phone_numbers && userData.phone_numbers.length > 0 ? (
                            <ul>
                                {userData.phone_numbers.map((phone, index) => (
                                    <li key={index}>{phone.name || 'Phone'}: {phone.phone_number}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>No phone numbers available.</p>
                        )}
                    </div>
                    <div className="family-info">
                        <h2>Family Information</h2>
                        {userData.family && userData.family.length > 0 ? (
                            <ul>
                                {userData.family.map((family, index) => (
                                    <li key={index}>{family.link}: Patient ID {family.patient_id}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>No family information available.</p>
                        )}
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfilePage;
