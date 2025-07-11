import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Modal } from 'react-bootstrap';
import { Search, User, Edit3, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InamiSearchModal from './InamiSearchModal';
import apiClient from '../services/apiClient';

const DoctorInfoTab = ({ patientId, currentDoctorInfo, onUpdate, canEdit = true }) => {
    const { t } = useTranslation();
    const [showInamiModal, setShowInamiModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [doctorInfo, setDoctorInfo] = useState({
        doctor_name: '',
        doctor_address: '',
        doctor_phone: '',
        doctor_email: '',
        inami_number: '',
        profession: '',
        convention_status: ''
    });
    const [originalInfo, setOriginalInfo] = useState({});
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (currentDoctorInfo) {
            const info = {
                doctor_name: currentDoctorInfo.doctor_name || '',
                doctor_address: currentDoctorInfo.doctor_address || '',
                doctor_phone: currentDoctorInfo.doctor_phone || '',
                doctor_email: currentDoctorInfo.doctor_email || '',
                inami_number: currentDoctorInfo.inami_number || '',
                profession: currentDoctorInfo.profession || '',
                convention_status: currentDoctorInfo.convention_status || ''
            };
            setDoctorInfo(info);
            setOriginalInfo(info);
        }
    }, [currentDoctorInfo]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDoctorInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectProvider = (provider) => {
        setDoctorInfo({
            doctor_name: provider.name || '',
            doctor_address: provider.work_address || '',
            doctor_phone: provider.phone || '',
            doctor_email: provider.email || '',
            inami_number: provider.inami_number || '',
            profession: provider.profession || '',
            convention_status: provider.convention_status || ''
        });
        setShowInamiModal(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await apiClient.patch(`/account/patients/${patientId}/`, {
                doctor_name: doctorInfo.doctor_name,
                doctor_address: doctorInfo.doctor_address,
                doctor_phone: doctorInfo.doctor_phone,
                doctor_email: doctorInfo.doctor_email
            });

            if (response.status === 200) {
                setSuccess(t('doctor_info.success.updated', 'Doctor information updated successfully'));
                setIsEditing(false);
                setOriginalInfo({ ...doctorInfo });
                
                if (onUpdate) {
                    onUpdate(doctorInfo);
                }
                
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (error) {
            console.error('Error updating doctor info:', error);
            setError(t('doctor_info.error.update_failed', 'Failed to update doctor information'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setDoctorInfo({ ...originalInfo });
        setIsEditing(false);
        setError(null);
        setSuccess(null);
    };

    const hasChanges = () => {
        return JSON.stringify(doctorInfo) !== JSON.stringify(originalInfo);
    };

    return (
        <>
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <User className="me-2" size={20} />
                        {t('doctor_info.title', 'General Practitioner Information')}
                    </h5>
                    <div>
                        {canEdit && !isEditing && (
                            <>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => setShowInamiModal(true)}
                                >
                                    <Search className="me-1" size={16} />
                                    {t('doctor_info.search_inami', 'Search INAMI')}
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit3 className="me-1" size={16} />
                                    {t('common.edit', 'Edit')}
                                </Button>
                            </>
                        )}
                        {isEditing && (
                            <>
                                <Button
                                    variant="success"
                                    size="sm"
                                    className="me-2"
                                    onClick={handleSave}
                                    disabled={isLoading || !hasChanges()}
                                >
                                    <Save className="me-1" size={16} />
                                    {t('common.save', 'Save')}
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    <X className="me-1" size={16} />
                                    {t('common.cancel', 'Cancel')}
                                </Button>
                            </>
                        )}
                    </div>
                </Card.Header>

                <Card.Body>
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert variant="success" className="mb-3">
                            {success}
                        </Alert>
                    )}

                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.name', 'Doctor Name')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="doctor_name"
                                        value={doctorInfo.doctor_name}
                                        onChange={handleInputChange}
                                        readOnly={!isEditing}
                                        placeholder={t('doctor_info.name_placeholder', 'Enter doctor\'s name')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.phone', 'Phone Number')}</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="doctor_phone"
                                        value={doctorInfo.doctor_phone}
                                        onChange={handleInputChange}
                                        readOnly={!isEditing}
                                        placeholder={t('doctor_info.phone_placeholder', 'Enter phone number')}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.email', 'Email Address')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="doctor_email"
                                        value={doctorInfo.doctor_email}
                                        onChange={handleInputChange}
                                        readOnly={!isEditing}
                                        placeholder={t('doctor_info.email_placeholder', 'Enter email address')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.inami_number', 'INAMI Number')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="inami_number"
                                        value={doctorInfo.inami_number}
                                        readOnly={true}
                                        className="bg-light"
                                        placeholder={t('doctor_info.inami_placeholder', 'From INAMI search')}
                                    />
                                    <Form.Text className="text-muted">
                                        {t('doctor_info.inami_help', 'Use INAMI search to auto-fill this field')}
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.profession', 'Profession')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="profession"
                                        value={doctorInfo.profession}
                                        readOnly={true}
                                        className="bg-light"
                                        placeholder={t('doctor_info.profession_placeholder', 'From INAMI search')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('doctor_info.convention_status', 'Convention Status')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="convention_status"
                                        value={doctorInfo.convention_status}
                                        readOnly={true}
                                        className="bg-light"
                                        placeholder={t('doctor_info.convention_placeholder', 'From INAMI search')}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>{t('doctor_info.address', 'Address')}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="doctor_address"
                                value={doctorInfo.doctor_address}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                placeholder={t('doctor_info.address_placeholder', 'Enter doctor\'s address')}
                            />
                        </Form.Group>
                    </Form>

                    {!doctorInfo.doctor_name && !isEditing && (
                        <div className="text-center py-4">
                            <p className="text-muted mb-3">
                                {t('doctor_info.no_info', 'No doctor information available')}
                            </p>
                            {canEdit && (
                                <Button
                                    variant="primary"
                                    onClick={() => setShowInamiModal(true)}
                                >
                                    <Search className="me-2" size={16} />
                                    {t('doctor_info.search_add', 'Search and Add Doctor')}
                                </Button>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* INAMI Search Modal */}
            <InamiSearchModal
                show={showInamiModal}
                onHide={() => setShowInamiModal(false)}
                onSelectProvider={handleSelectProvider}
            />
        </>
    );
};

export default DoctorInfoTab;
