import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Form, Button, Table, Alert, Spinner, Row, Col, Badge, Card } from 'react-bootstrap';
import { Search, User, Phone, MapPin, Award, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import tokenManager from '../utils/tokenManager';
import './InamiSearchModal.css';

const InamiSearchModal = ({ show, onHide, onSelectProvider = null }) => {
    const { t } = useTranslation();
    const [searchForm, setSearchForm] = useState({
        name: '',
        firstname: '',
        profession: '',
        inami_number: '',
        location: ''
    });
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);

    useEffect(() => {
        if (show) {
            testConnection();
        }
    }, [show]);

    const testConnection = async () => {
        setIsTestingConnection(true);
        setConnectionStatus(null);
        
        try {
            const response = await tokenManager.authenticatedFetch('http://localhost:8000/account/inami/test-connection/', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                setConnectionStatus({ success: true, message: data.message });
            } else {
                setConnectionStatus({ success: false, message: data.error });
            }
        } catch (error) {
            console.error('Connection test error:', error);
            setConnectionStatus({ 
                success: false, 
                message: 'Failed to test connection to INAMI website' 
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSearchForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        
        const hasSearchParams = Object.values(searchForm).some(value => value.trim() !== '');
        if (!hasSearchParams) {
            setError(t('inami.error.no_search_params', 'Please enter at least one search parameter'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);
        setSearchResults([]);

        try {
            const response = await tokenManager.authenticatedFetch('http://localhost:8000/account/inami/search/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(searchForm),
            });
            const data = await response.json();
            
            if (data.success) {
                setSearchResults(data.providers);
                setSuccess(t('inami.success.found_providers', 
                    `Found ${data.total_results} healthcare providers`));
                
                if (data.providers.length === 0) {
                    setError(t('inami.error.no_results', 
                        'No healthcare providers found with the specified criteria. Try different search terms.'));
                }
            } else {
                setError(data.error || t('inami.error.search_failed', 'Search failed'));
            }
        } catch (error) {
            console.error('INAMI search error:', error);
            setError(t('inami.error.network', 'Network error occurred. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectProvider = (provider) => {
        if (onSelectProvider) {
            onSelectProvider(provider);
        }
        onHide();
    };

    const clearForm = () => {
        setSearchForm({
            name: '',
            firstname: '',
            profession: '',
            inami_number: '',
            location: ''
        });
        setSearchResults([]);
        setError(null);
        setSuccess(null);
    };

    const getConventionBadge = (status) => {
        if (status?.toLowerCase().includes('conventionné')) {
            return <Badge bg="success">Conventionné</Badge>;
        } else if (status?.toLowerCase().includes('non-conventionné')) {
            return <Badge bg="warning">Non-conventionné</Badge>;
        } else if (status?.toLowerCase().includes('partiellement')) {
            return <Badge bg="info">Partiellement conventionné</Badge>;
        }
        return <Badge bg="secondary">{status || 'Non spécifié'}</Badge>;
    };

    if (!show) return null;

    return ReactDOM.createPortal(
        (
            <div className="inami-search-backdrop" onClick={onHide}>
                <div className="inami-search-modal" onClick={e => e.stopPropagation()}>
                    <div className="inami-search-header">
                        <h3>
                            <Search className="me-2" size={20} />
                    {t('inami.title', 'Search INAMI Healthcare Providers')}
                        </h3>
                        <button className="inami-close-btn" onClick={onHide}>×</button>
                    </div>

                    <div className="inami-search-body">
                {/* Connection Status */}
                <div className="mb-3">
                    {isTestingConnection && (
                        <Alert variant="info" className="d-flex align-items-center">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Testing connection to INAMI website...
                        </Alert>
                    )}
                    
                    {connectionStatus && (
                        <Alert variant={connectionStatus.success ? 'success' : 'danger'}>
                            {connectionStatus.success ? (
                                <CheckCircle className="me-2" size={16} />
                            ) : (
                                <XCircle className="me-2" size={16} />
                            )}
                            {connectionStatus.message}
                        </Alert>
                    )}
                </div>

                {/* Search Form */}
                <Card className="mb-4">
                    <Card.Header>
                        <h5 className="mb-0">{t('inami.search_form', 'Search Criteria')}</h5>
                    </Card.Header>
                    <Card.Body>
                        <Form onSubmit={handleSearch}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{t('inami.name', 'Last Name')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={searchForm.name}
                                            onChange={handleInputChange}
                                            placeholder={t('inami.name_placeholder', 'Enter last name')}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{t('inami.firstname', 'First Name')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="firstname"
                                            value={searchForm.firstname}
                                            onChange={handleInputChange}
                                            placeholder={t('inami.firstname_placeholder', 'Enter first name')}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{t('inami.profession', 'Profession')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="profession"
                                            value={searchForm.profession}
                                            onChange={handleInputChange}
                                            placeholder={t('inami.profession_placeholder', 'e.g., Médecin, Dentiste')}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{t('inami.inami_number', 'INAMI Number')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="inami_number"
                                            value={searchForm.inami_number}
                                            onChange={handleInputChange}
                                            placeholder={t('inami.inami_number_placeholder', 'Enter INAMI number')}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{t('inami.location', 'Location')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="location"
                                            value={searchForm.location}
                                            onChange={handleInputChange}
                                            placeholder={t('inami.location_placeholder', 'Enter city or postal code')}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6} className="d-flex align-items-end">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isLoading}
                                        className="me-2 mb-3"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                {t('inami.searching', 'Searching...')}
                                            </>
                                        ) : (
                                            <>
                                                <Search className="me-2" size={16} />
                                                {t('inami.search', 'Search')}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        onClick={clearForm}
                                        className="mb-3"
                                    >
                                        {t('inami.clear', 'Clear')}
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Card.Body>
                </Card>

                {/* Alerts */}
                {error && (
                    <Alert variant="danger" className="mb-3">
                        <XCircle className="me-2" size={16} />
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert variant="success" className="mb-3">
                        <CheckCircle className="me-2" size={16} />
                        {success}
                    </Alert>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">
                                {t('inami.results', 'Search Results')} ({searchResults.length})
                            </h5>
                        </Card.Header>
                                <Card.Body className="inami-results-container">
                            <Row>
                                {searchResults.map((provider, index) => (
                                    <Col md={6} key={index} className="mb-3">
                                        <Card className="h-100 provider-card">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h6 className="card-title mb-1">
                                                        <User className="me-2" size={16} />
                                                        {provider.name}
                                                    </h6>
                                                    {getConventionBadge(provider.convention_status)}
                                                </div>
                                                
                                                <div className="mb-2">
                                                    <strong>{provider.profession}</strong>
                                                    {provider.inami_number && (
                                                        <div className="text-muted small">
                                                            INAMI: {provider.inami_number}
                                                        </div>
                                                    )}
                                                </div>

                                                {provider.qualification && (
                                                    <div className="mb-2">
                                                        <Award className="me-1" size={14} />
                                                        <small className="text-muted">
                                                            {provider.qualification}
                                                        </small>
                                                    </div>
                                                )}

                                                {provider.qualification_date && (
                                                    <div className="mb-2">
                                                        <Calendar className="me-1" size={14} />
                                                        <small className="text-muted">
                                                            Qualified: {provider.qualification_date}
                                                        </small>
                                                    </div>
                                                )}

                                                {provider.work_address && 
                                                 !provider.work_address.includes('Pas d\'adresse') && (
                                                    <div className="mb-2">
                                                        <MapPin className="me-1" size={14} />
                                                        <small className="text-muted">
                                                            {provider.work_address}
                                                        </small>
                                                    </div>
                                                )}

                                                {onSelectProvider && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => handleSelectProvider(provider)}
                                                        className="mt-2"
                                                    >
                                                        {t('inami.select', 'Select this provider')}
                                                    </Button>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                )}
                    </div>

                    <div className="inami-search-footer">
                <Button variant="secondary" onClick={onHide}>
                    {t('common.close', 'Close')}
                </Button>
                    </div>
                </div>
            </div>
        ),
        document.body
    );
};

export default InamiSearchModal;
