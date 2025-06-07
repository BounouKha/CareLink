import React, { useEffect, useState } from 'react';
import './ProfileList.css';
import BaseLayout from '../auth/layout/BaseLayout'; // Adjust the import path as necessary
import ShowProfileModal from './ShowProfileModal';
import EditProfileModal from './EditProfileModal';

const ProfileList = () => {
    const [profiles, setProfiles] = useState([]); // Ensure profiles is initialized as an empty array
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
            console.log('Fetched profiles:', data.results); // Log fetched profiles
            const filteredProfiles = (data.results || []).filter(profile => profile.id !== null && profile.user_id !== null);
            setProfiles(filteredProfiles); // Only include profiles with non-null id and user_id
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

    const handleShowProfile = (profile) => {
        setSelectedProfile(profile);
        setIsShowModalOpen(true);
    };

    const handleEditProfile = (profile) => {
        setSelectedProfile(profile);
        setIsEditModalOpen(true);
    };

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
                                    <th>Actions</th>
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
                                            <td>
                                                <button onClick={() => handleShowProfile(profile)}>Show</button>
                                                <button onClick={() => handleEditProfile(profile)}>Edit</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5">No profiles available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>                    <div className="pagination">
                        <button
                            disabled={!hasPreviousPage}
                            onClick={() => {
                                setPage((prevPage) => Math.max(prevPage - 1, 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            Previous
                        </button>
                        <button
                            disabled={!hasNextPage}
                            onClick={() => {
                                setPage((prevPage) => prevPage + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            Next
                        </button>
                    </div>
                    {isShowModalOpen && (
                        <ShowProfileModal
                            profile={selectedProfile}
                            onClose={() => setIsShowModalOpen(false)}
                        />
                    )}
                    {isEditModalOpen && (
                        <EditProfileModal
                            profile={selectedProfile}
                            onClose={() => setIsEditModalOpen(false)}
                            onSave={() => fetchProfiles(page)}
                        />
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

export default ProfileList;
