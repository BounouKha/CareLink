import React, { useState } from 'react';
import './LeftToolbar.css';
import { useNavigate } from 'react-router-dom';

const LeftToolbar = () => {
    const [isVisible, setIsVisible] = useState(true);
    const navigate = useNavigate();

    const toggleToolbar = () => {
        setIsVisible(!isVisible);
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    return (
        <div>
            <button className="toggle-button" onClick={toggleToolbar}>
                {isVisible ? '<' : '>'}
            </button>
            <div className={`left-toolbar ${isVisible ? 'visible' : 'hidden'}`}>
                <ul className="toolbar-list">
                    <li onClick={handleProfileClick} className="clickable">Profile</li>
                </ul>
            </div>
        </div>
    );
};

export default LeftToolbar;
