import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useProfileStatus } from '../hooks/useProfileStatus';
import WaitingForActivation from './WaitingForActivation';

const MedicalInfoTab = ({ patientId, userData, userRole }) => {
    const { t } = useTranslation();
    const [medicalInfo, setMedicalInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);
    
    // Profile verification hook
    const { 
        profileStatus, 
        needsActivation, 
        needsMedicalInfo, 
        waitingMessage,
        requestProfileActivation 
    } = useProfileStatus();

    useEffect(() => {
        if (patientId && !needsMedicalInfo) {
            fetchMedicalInfo();
        } else {
            setLoading(false);
        }
    }, [patientId, needsMedicalInfo]);

    const fetchMedicalInfo = async () => {
        if (!patientId) {
            setError('Patient ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // This would be your actual API call for medical information
            const response = await fetch(`http://localhost:8000/account/patient/${patientId}/medical-info/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // No medical info yet, show empty state
                    setMedicalInfo(null);
                    setError('');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const data = await response.json();
            setMedicalInfo(data);
            
        } catch (err) {
            console.error('Error fetching medical info:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestActivation = async () => {
        setRequestLoading(true);
        try {
            const result = await requestProfileActivation();
            return result;
        } finally {
            setRequestLoading(false);
        }
    };

    // Show waiting activation if medical info section needs activation
    if (needsMedicalInfo) {
        return (
            <WaitingForActivation
                section="medical-info"
                message={waitingMessage}
                showRequestButton={true}
                onRequestActivation={handleRequestActivation}
                requestLoading={requestLoading}
            />
        );
    }

    if (loading) {
        return (
            <Card>
                <Card.Body>
                    <div className="text-center">
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Loading medical information...
                    </div>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Card.Body>
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Error loading medical information: {error}
                    </div>
                </Card.Body>
            </Card>
        );
    }

    // Render normal medical info content
    return (
        <Card>
            <Card.Body>
                {!medicalInfo ? (
                    <div className="text-center text-muted">
                        <i className="fas fa-heartbeat mb-3" style={{ fontSize: '48px' }}></i>
                        <p>{t('profile.no_medical_info', 'No medical information available')}</p>
                    </div>
                ) : (
                    <div className="medical-info-details">
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h5 className="border-bottom pb-2">Basic Information</h5>
                                <div className="mb-2">
                                    <strong>{t('profile.blood_type', 'Blood Type')}:</strong>
                                    <span className="ms-2">{medicalInfo.blood_type || 'Not specified'}</span>
                                </div>
                                <div className="mb-2">
                                    <strong>{t('profile.gender', 'Gender')}:</strong>
                                    <span className="ms-2">{medicalInfo.gender || 'Not specified'}</span>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <h5 className="border-bottom pb-2">Assessment Scores</h5>
                                <div className="mb-2">
                                    <strong>Katz Score:</strong>
                                    <span className="ms-2">{medicalInfo.katz_score || 'Not assessed'}</span>
                                </div>
                                <div className="mb-2">
                                    <strong>IT Score:</strong>
                                    <span className="ms-2">{medicalInfo.it_score || 'Not assessed'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-12">
                                <h5 className="border-bottom pb-2">Health Conditions</h5>
                                <div className="mb-2">
                                    <strong>{t('profile.primary_illness', 'Primary Illness')}:</strong>
                                    <span className="ms-2">{medicalInfo.illness || 'None specified'}</span>
                                </div>
                                <div className="mb-2">
                                    <strong>{t('profile.current_medications', 'Current Medications')}:</strong>
                                    <span className="ms-2">{medicalInfo.medication || 'None specified'}</span>
                                </div>
                            </div>
                        </div>

                        {medicalInfo.critical_information && (
                            <div className="row">
                                <div className="col-12">
                                    <div className="alert alert-warning">
                                        <h5 className="alert-heading">
                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                            Critical Information
                                        </h5>
                                        <p className="mb-0">{medicalInfo.critical_information}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default MedicalInfoTab;
