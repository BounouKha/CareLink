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
    };    const handleEditProfile = (profile) => {
        setSelectedProfile(profile);
        setIsEditModalOpen(true);
    };    const getRoleBadgeClass = (role) => {
        // Don't show badge for "New entry" or empty/null roles
        if (!role || role.toLowerCase() === 'new entry') {
            return 'd-none'; // Hide the badge completely
        }
        
        switch (role?.toLowerCase()) {
            case 'administrative':
                return 'bg-warning bg-opacity-20 text-dark';
            case 'patient':
                return 'bg-primary bg-opacity-20 text-light';
            case 'coordinator':
                return 'bg-success bg-opacity-20 text-light';
            case 'family patient':
                return 'bg-info bg-opacity-20 text-dark';
            case 'social assistant':
                return 'bg-secondary bg-opacity-20 text-light';
            case 'provider':
                return 'bg-success bg-opacity-20 text-light';
            default:
                return 'bg-light text-dark';
        }
    };return (
        <BaseLayout>
            <div className="container-fluid py-4">
                <div className="row justify-content-center">
                    <div className="col-12">
                        {/* Header Section */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-primary bg-opacity-10 border-0">
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-users me-3 text-primary" style={{fontSize: '2rem'}}></i>
                                    <div>
                                        <h4 className="card-title mb-0">Profile Management</h4>
                                        <p className="text-muted mb-0">Manage user profiles and view profile details</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {error}
                            </div>
                        )}

                        {/* Profiles Table Card */}
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-light border-0">
                                <h5 className="card-title mb-0">
                                    <i className="fas fa-table me-2 text-secondary"></i>
                                    All Profiles
                                </h5>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th scope="col" className="border-0">
                                                    <i className="fas fa-hashtag me-2 text-muted"></i>
                                                    ID
                                                </th>
                                                <th scope="col" className="border-0">
                                                    <i className="fas fa-user me-2 text-muted"></i>
                                                    First Name
                                                </th>
                                                <th scope="col" className="border-0">
                                                    <i className="fas fa-user me-2 text-muted"></i>
                                                    Last Name
                                                </th>
                                                <th scope="col" className="border-0">
                                                    <i className="fas fa-user-tag me-2 text-muted"></i>
                                                    Role
                                                </th>
                                                <th scope="col" className="border-0 text-center">
                                                    <i className="fas fa-cogs me-2 text-muted"></i>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profiles.length > 0 ? (
                                                profiles.map((profile, index) => (
                                                    <tr key={index} className="align-middle">
                                                        <td className="border-0">                                            <span className="badge bg-primary bg-opacity-20 text-light">
                                                {profile.id}
                                            </span>
                                                        </td>
                                                        <td className="border-0">
                                                            <span className="fw-medium">{profile.firstname}</span>
                                                        </td>
                                                        <td className="border-0">
                                                            <span className="fw-medium">{profile.lastname}</span>
                                                        </td>                                        <td className="border-0">
                                            {profile.role && profile.role.toLowerCase() !== 'new entry' ? (
                                                <span className={`badge ${getRoleBadgeClass(profile.role)}`}>
                                                    {profile.role}
                                                </span>
                                            ) : (
                                                <span className="text-muted fst-italic">No role assigned</span>
                                            )}
                                        </td>
                                                        <td className="border-0 text-center">
                                                            <div className="btn-group" role="group">
                                                                <button 
                                                                    className="btn btn-info btn-sm"
                                                                    onClick={() => handleShowProfile(profile)}
                                                                    title="View Profile Details"
                                                                >
                                                                    <i className="fas fa-eye me-1"></i>
                                                                    Show
                                                                </button>
                                                                <button 
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => handleEditProfile(profile)}
                                                                    title="Edit Profile"
                                                                >
                                                                    <i className="fas fa-edit me-1"></i>
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 border-0">
                                                        <div className="text-muted">
                                                            <i className="fas fa-users" style={{fontSize: '3rem', opacity: '0.3'}}></i>
                                                            <h5 className="mt-3">No profiles available</h5>
                                                            <p className="mb-0">No user profiles found in the system.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Pagination Footer */}
                            {(hasNextPage || hasPreviousPage) && (
                                <div className="card-footer bg-light border-0">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <button
                                            className="btn btn-outline-primary"
                                            disabled={!hasPreviousPage}
                                            onClick={() => {
                                                setPage((prevPage) => Math.max(prevPage - 1, 1));
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            <i className="fas fa-chevron-left me-2"></i>
                                            Previous
                                        </button>
                                        
                                        <span className="text-muted">
                                            <i className="fas fa-file-alt me-2"></i>
                                            Page {page}
                                        </span>
                                        
                                        <button
                                            className="btn btn-outline-primary"
                                            disabled={!hasNextPage}
                                            onClick={() => {
                                                setPage((prevPage) => prevPage + 1);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            Next
                                            <i className="fas fa-chevron-right ms-2"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
        </BaseLayout>
    );
};

export default ProfileList;
