import React, { useEffect, useState } from 'react';
import './ShowProfileModal.css';

const ShowProfileModal = ({ profile, onClose }) => {
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('No access token found. Please log in.');
                }

                const response = await fetch(`http://localhost:8000/account/profiles/${profile.id}/fetch/${profile.role}/`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('Fetch response:', response);

                if (!response.ok) {
                    throw new Error('Failed to fetch profile details.');
                }

                const data = await response.json();
                console.log('Fetched data:', data);
                setDetails(data);
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err.message);
            }
        };

        fetchDetails();
    }, [profile]);

    useEffect(() => {
        console.log('Updated details state:', details);
    }, [details]);

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <h2>Profile Details</h2>
                {error && <p className="error">{error}</p>}
                {details ? (
                    <div>
                        <p><strong>ID:</strong> {details.id}</p>
                        <p><strong>First Name:</strong> {details.firstname}</p>
                        <p><strong>Last Name:</strong> {details.lastname}</p>
                        {Object.entries(details.additional_fields).filter(([key]) => key !== 'is_internal' && key !== 'service').map(([key, value]) => (
                            <p key={key}><strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}</p>
                        ))}
                        {details.additional_fields.is_internal !== undefined && (
                            <p><strong>Is Internal:</strong> {details.additional_fields.is_internal ? 'Yes' : 'No'}</p>
                        )}
                        {details.additional_fields.service && (
                            <p><strong>Service:</strong> ID: {details.additional_fields.service.id}, Name: {details.additional_fields.service.name}</p>
                        )}
                    </div>
                ) : (
                    <p>Loading...</p>
                )}
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default ShowProfileModal;
