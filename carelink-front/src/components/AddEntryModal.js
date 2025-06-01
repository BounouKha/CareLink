import React from 'react';
import './AddEntryModal.css';

const AddEntryModal = ({ isVisible, onSubmit, onCancel, note, setNote }) => {
    if (!isVisible) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>Add Entry</h2>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter your note here..."
                    rows="5"
                />
                <button onClick={() => onSubmit(note)}>Submit</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default AddEntryModal;
