import React, { useState } from 'react';
import './MedicalEntry.css';
import AddEntryModal from '../../components/AddEntryModal';

const MedicalEntry = ({ selectedPatient }) => {
    const [showModal, setShowModal] = useState(false);
    const [note, setNote] = useState('');

    const handleAddEntry = async () => {
        try {
            if (!note) {
                alert('Note cannot be empty.');
                return;
            }

            const response = await fetch(`http://localhost:8000/account/medical_folder/${selectedPatient.id}/`, {
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
            setShowModal(false);
            setNote('');
        } catch (error) {
            console.error('Error adding new entry:', error);
            alert('An error occurred while adding the entry.');
        }
    };

    return (
        <div>
            <button className="add-entry-button" onClick={() => setShowModal(true)}>Add Entry</button>
            <AddEntryModal
                isVisible={showModal}
                onSubmit={handleAddEntry}
                onCancel={() => { setShowModal(false); setNote(''); }}
                note={note}
                setNote={setNote}
            />
        </div>
    );
};

export default MedicalEntry;