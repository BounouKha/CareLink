import React from 'react';
import { useCareTranslation } from '../hooks/useCareTranslation';
// CSS is now handled by UnifiedBaseLayout.css

const AddEntryModal = ({ isVisible, onSubmit, onCancel, note, setNote }) => {
    // Use translation hooks
    const { patients, placeholders, common } = useCareTranslation();
    
    if (!isVisible) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>{patients('addEntry')}</h2>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={placeholders('enterNotes')}
                    rows="5"
                />
                <button onClick={() => onSubmit(note)}>{common('submit')}</button>
                <button onClick={onCancel}>{common('cancel')}</button>
            </div>
        </div>
    );
};

export default AddEntryModal;
