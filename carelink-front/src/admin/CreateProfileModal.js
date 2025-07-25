import React, { useState } from 'react';
import './CreateProfileModal.css';
import CreatePatientModal from './CreatePatientModal';
import CreateCoordinatorModal from './CreateCoordinatorModal';
import CreateProviderModal from './CreateProviderModal';
import CreateSocialAssistantModal from './CreateSocialAssistantModal';
import CreateAdministrativeModal from './CreateAdministrativeModal';
import CreateFamilyPatientModal from './CreateFamilyPatientModal';

const CreateProfileModal = ({ userId, role, onClose, onProfileCreated }) => {
    console.log('CreateProfileModal - userId:', userId, 'role:', role); // Debug log
    
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
    };    // Return the role form directly since each modal handles its own overlay/structure
    return renderRoleForm();
};

export default CreateProfileModal;
