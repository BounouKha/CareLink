import React from 'react';
import BaseLayout from '../auth/layout/BaseLayout';
import './PatientLayout.css';

const PatientLayout = ({ children }) => {
    return (
        <BaseLayout>
            <div className="patient-layout-container">
                <div className="patient-layout-content">
                    {children}
                </div>
            </div>
        </BaseLayout>
    );
};

export default PatientLayout;
