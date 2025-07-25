import React from 'react';

const PatientActions = ({ handleShowDetails, handleShowMedicalFolder }) => {
    const handleAddEntry = async () => {
        try {
            const note = prompt('Enter the note for the new entry:');
            if (!note) {
                alert('Note cannot be empty.');
                return;
            }

            const response = await fetch('http://localhost:8000/account/medical_folder/new_entry/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({ note }),
            });

            if (!response.ok) {
                throw new Error('Failed to add new entry to the medical folder.');
            }

            alert('New entry added successfully!');
        } catch (error) {
            console.error('Error adding new entry:', error);
            alert('An error occurred while adding the entry.');
        }
    };

    return (
        <div className="patient-actions">
            <button onClick={handleShowDetails}>Patient Information</button>
            <button onClick={handleShowMedicalFolder}>Medical Folder</button>
            <button onClick={handleAddEntry}>Add Entry</button>
        </div>
    );
};

export default PatientActions;