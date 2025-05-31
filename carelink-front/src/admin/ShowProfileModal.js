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
                        <p><strong>First Name:</strong> {details.firstname}</p>
                        <p><strong>Last Name:</strong> {details.lastname}</p>
                        {details.patient && (
                            <div>
                                <p><strong>Linked Patient First Name:</strong> {details.patient.firstname}</p>
                                <p><strong>Linked Patient Last Name:</strong> {details.patient.lastname}</p>
                            </div>
                        )}
                        {Object.entries(details.additional_fields).map(([key, value]) => (
                            <p key={key}>
                                <strong>{key}:</strong> {
                                    key === 'is_internal' ? (value ? 'Yes' : 'No') :
                                    key === 'service' ? `ID: ${value.id}, Name: ${value.name}` :
                                    key === 'familypatient' ? (
                                        <>
                                            ID: {value.id}, Last Name: {value.lastname}, First Name: {value.firstname}
                                            {value.patient_id && value.patient_user && (
                                                <>
                                                    <br />Linked Patient ID: {value.patient_id}
                                                    <br />Linked User First Name: {value.patient_user.firstname}
                                                    <br />Linked User Last Name: {value.patient_user.lastname}
                                                </>
                                            )}
                                        </>
                                    ) :
                                    typeof value === 'object' ? JSON.stringify(value) : value
                                }
                            </p>
                        ))}
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
