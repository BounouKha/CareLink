import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tab, Tabs, Card, Alert } from 'react-bootstrap';
import { User, FileText, Calendar, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { isPatient, isStaff } from '../utils/roleUtils';
import DoctorInfoTab from '../components/DoctorInfoTab';
import MedicalInfoTab from '../components/MedicalInfoTab';
import '../styles/InamiSearch.css';

const PatientProfile = ({ patientId }) => {
    const { t } = useTranslation();
    const { tokenInfo } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [patientData, setPatientData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get current user from token
    const currentUser = tokenInfo?.user;
    
    // Check if current user can edit this patient's doctor info
    // Patients can edit their own info, staff can edit any patient's info
    const canEditDoctorInfo = currentUser && (
        isStaff(currentUser) || 
        (isPatient(currentUser) && currentUser.id === parseInt(patientId))
    );

    // Debug logging
    useEffect(() => {
        console.log('🔍 [PatientProfile] Debug info:');
        console.log('- currentUser:', currentUser);
        console.log('- patientId:', patientId);
        console.log('- currentUser.id:', currentUser?.id);
        console.log('- isStaff(currentUser):', currentUser ? isStaff(currentUser) : 'no user');
        console.log('- isPatient(currentUser):', currentUser ? isPatient(currentUser) : 'no user');
        console.log('- canEditDoctorInfo:', canEditDoctorInfo);
        console.log('🎯 BUTTON SHOULD APPEAR:', canEditDoctorInfo ? 'YES' : 'NO');
    }, [currentUser, patientId, canEditDoctorInfo]);

    useEffect(() => {
        fetchPatientData();
    }, [patientId]);

    const fetchPatientData = async () => {
        try {
            setIsLoading(true);
            // This would be your actual API call
            // const response = await apiClient.get(`/account/patients/${patientId}/`);
            
            // Mock data for demonstration
            const mockData = {
                id: patientId,
                firstname: 'Jean',
                lastname: 'Dupont',
                birthdate: '1980-05-15',
                gender: 'M',
                doctor_name: '', // Empty = shows big "Search and Add Doctor" button
                doctor_address: '',
                doctor_phone: '',
                doctor_email: '',
                // ... other patient fields
            };
            
            setPatientData(mockData);
        } catch (error) {
            console.error('Error fetching patient data:', error);
            setError('Failed to load patient data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDoctorInfoUpdate = (updatedDoctorInfo) => {
        // Update the patient data with new doctor information
        setPatientData(prev => ({
            ...prev,
            ...updatedDoctorInfo
        }));
    };

    if (isLoading) {
        return (
            <Container className="py-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-4">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Row>
                <Col>
                    <Card className="mb-4">
                        <Card.Header>
                            <h4 className="mb-0">
                                <User className="me-2" size={24} />
                                {t('profile.patient_profile', 'Patient Profile')}: {patientData?.firstname} {patientData?.lastname}
                            </h4>
                        </Card.Header>
                    </Card>

                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="mb-3"
                    >
                        <Tab 
                            eventKey="general" 
                            title={
                                <span>
                                    <FileText className="me-2" size={16} />
                                    {t('profile.general_info', 'General Information')}
                                </span>
                            }
                        >
                            <Card>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>{t('common.firstName', 'First Name')}:</strong> {patientData?.firstname}</p>
                                            <p><strong>{t('common.name', 'Last Name')}:</strong> {patientData?.lastname}</p>
                                            <p><strong>{t('profile.birthdate', 'Birth Date')}:</strong> {patientData?.birthdate}</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>{t('profile.gender', 'Gender')}:</strong> {patientData?.gender}</p>
                                            {/* Add other general information fields */}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Tab>

                        <Tab 
                            eventKey="doctor" 
                            title={
                                <span>
                                    <Stethoscope className="me-2" size={16} />
                                    {t('profile.doctor_info', 'Doctor Information')}
                                </span>
                            }
                        >
                            <DoctorInfoTab
                                patientId={patientId}
                                currentDoctorInfo={patientData}
                                onUpdate={handleDoctorInfoUpdate}
                                canEdit={canEditDoctorInfo}
                            />
                        </Tab>

                        <Tab 
                            eventKey="medical" 
                            title={
                                <span>
                                    <FileText className="me-2" size={16} />
                                    {t('profile.medical_info', 'Medical Information')}
                                </span>
                            }
                        >
                            <MedicalInfoTab
                                patientId={patientId}
                                userData={patientData}
                                userRole={currentUser?.role}
                            />
                        </Tab>

                        <Tab 
                            eventKey="appointments" 
                            title={
                                <span>
                                    <Calendar className="me-2" size={16} />
                                    {t('profile.appointments', 'Appointments')}
                                </span>
                            }
                        >
                            <Card>
                                <Card.Body>
                                    <p>{t('profile.appointments_placeholder', 'Appointment history will be displayed here.')}</p>
                                    {/* Add appointment components */}
                                </Card.Body>
                            </Card>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
};

export default PatientProfile;
