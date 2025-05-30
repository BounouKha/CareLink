import React, { useEffect, useState } from 'react';
import './ProfileList.css';
import BaseLayout from '../auth/BaseLayout'; // Adjust the import path as necessary

const ProfileList = () => {
    const [profiles, setProfiles] = useState([]); // Ensure profiles is initialized as an empty array
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);

    const fetchProfiles = async (page) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/profiles/?page=${page}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profiles.');
            }

            const data = await response.json();
            setProfiles(data.results || []); // Ensure profiles is set to an empty array if data.results is undefined
            setHasNextPage(!!data.next);
            setHasPreviousPage(!!data.previous);
        } catch (err) {
            setError(err.message);
            setProfiles([]); // Reset profiles to an empty array in case of an error
        }
    };

    useEffect(() => {
        fetchProfiles(page);
    }, [page]);

    return (
        <BaseLayout>
            <div className="admin-section">
                <h2>Admin Panel</h2>
                <div className="profile-list">
                    <h1>Profiles</h1>
                    {error && <p className="error">{error}</p>}
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.length > 0 ? (
                                    profiles.map((profile, index) => (
                                        <tr key={index}>
                                            <td>{profile.id}</td>
                                            <td>{profile.firstname}</td>
                                            <td>{profile.lastname}</td>
                                            <td>{profile.role}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4">No profiles available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination">
                        <button
                            disabled={!hasPreviousPage}
                            onClick={() => setPage((prevPage) => Math.max(prevPage - 1, 1))}
                        >
                            Previous
                        </button>
                        <button
                            disabled={!hasNextPage}
                            onClick={() => setPage((prevPage) => prevPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfileList;
