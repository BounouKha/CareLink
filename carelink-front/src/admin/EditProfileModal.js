import React from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ profile, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <h2>Edit Profile</h2>
                <p>Editing functionality has been removed.</p>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default EditProfileModal;
