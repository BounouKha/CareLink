import React, { useState } from 'react';
import './CreateProfileModal.css';
import CreatePatientModal from './CreatePatientModal';
import CreateCoordinatorModal from './CreateCoordinatorModal';
import CreateProviderModal from './CreateProviderModal';
import CreateSocialAssistantModal from './CreateSocialAssistantModal';
import CreateAdministrativeModal from './CreateAdministrativeModal';
import CreateFamilyPatientModal from './CreateFamilyPatientModal';

const CreateProfileModal = ({ userId, role, onClose, onProfileCreated }) => {
    const renderRoleForm = () => {
        switch (role) {
            case 'Patient':
                return (
                    <CreatePatientModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            case 'Coordinator':
                return (
                    <CreateCoordinatorModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            case 'Provider':
                return (
                    <CreateProviderModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            case 'Social Assistant':
                return (
                    <CreateSocialAssistantModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            case 'Administrative':
                return (
                    <CreateAdministrativeModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            case 'Family Patient':
                return (
                    <CreateFamilyPatientModal
                        userId={userId}
                        onClose={onClose}
                        onProfileCreated={onProfileCreated}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {renderRoleForm()}
            </div>
        </div>
    );
};

export default CreateProfileModal;
