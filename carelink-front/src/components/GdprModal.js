import React from 'react';
import './GdprModal.css';

const GdprModal = ({ show, onHide, onAccept, onDecline }) => {
    if (!show) return null;

    return (
        <div className="gdpr-modal-overlay" onClick={onHide}>
            <div className="gdpr-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="gdpr-modal-header-custom">
                    <h2 className="gdpr-modal-title">
                        <i className="fas fa-shield-alt me-2"></i>
                        GDPR Data Protection Consent
                    </h2>
                    <button className="gdpr-modal-close-btn" onClick={onHide}>×</button>
                </div>
                
                <div className="gdpr-modal-content-custom">
                    <div className="gdpr-intro-custom">
                        <p className="lead">
                            <strong>Data Protection Notice</strong> - In compliance with the EU General Data Protection Regulation (GDPR)
                        </p>
                        <p>
                            By creating an account with CareLink, you acknowledge and consent to the collection, 
                            processing, and storage of your personal data as outlined below:
                        </p>
                    </div>

                    <div className="gdpr-sections-custom">
                        <div className="gdpr-section-custom">
                            <h5><i className="fas fa-user-shield text-primary me-2"></i>Sensitive Information Processing</h5>
                            <ul>
                                <li>We collect and process <strong>health-related data</strong> necessary for providing healthcare services</li>
                                <li>Your <strong>medical history, conditions, and treatment information</strong> will be stored securely</li>
                                <li>Access to sensitive data is limited to authorized healthcare professionals only</li>
                                <li>Data is encrypted both in transit and at rest using industry-standard encryption</li>
                            </ul>
                        </div>

                        <div className="gdpr-section-custom">
                            <h5><i className="fas fa-clipboard text-warning me-2"></i>Internal Notes & Documentation</h5>
                            <ul>
                                <li>Healthcare providers may create <strong>internal notes</strong> about your care</li>
                                <li>These notes are used for continuity of care and medical decision-making</li>
                                <li>Internal documentation is subject to the same privacy protections as your medical records</li>
                                <li>You have the right to request access to these notes under GDPR Article 15</li>
                            </ul>
                        </div>

                        <div className="gdpr-section-custom">
                            <h5><i className="fas fa-folder-medical text-success me-2"></i>Medical Folder & Records</h5>
                            <ul>
                                <li>Your complete <strong>medical folder</strong> will be stored digitally on our secure servers</li>
                                <li>This includes prescriptions, diagnoses, treatment plans, and appointment history</li>
                                <li>Medical records are retained according to legal requirements and medical standards</li>
                                <li>You can request a copy of your medical folder at any time</li>
                            </ul>
                        </div>

                        <div className="gdpr-section-custom">
                            <h5><i className="fas fa-database text-info me-2"></i>Personal Information Storage</h5>
                            <ul>
                                <li>Your <strong>personal information</strong> (name, address, contact details, national number) will be stored securely</li>
                                <li>Data is processed lawfully under GDPR Article 6 (legitimate interest) and Article 9 (health data)</li>
                                <li>Information is shared only with authorized healthcare providers involved in your care</li>
                                <li>We implement appropriate technical and organizational measures to protect your data</li>
                            </ul>
                        </div>
                    </div>

                    <div className="gdpr-rights-custom">
                        <h5><i className="fas fa-balance-scale text-secondary me-2"></i>Your GDPR Rights</h5>
                        <div className="row">
                            <div className="col-md-6">
                                <ul>
                                    <li><strong>Right of Access</strong> - Request copies of your data</li>
                                    <li><strong>Right to Rectification</strong> - Correct inaccurate data</li>
                                    <li><strong>Right to Erasure</strong> - Request deletion of your data*</li>
                                </ul>
                            </div>
                            <div className="col-md-6">
                                <ul>
                                    <li><strong>Right to Portability</strong> - Transfer your data</li>
                                    <li><strong>Right to Object</strong> - Object to certain processing</li>
                                    <li><strong>Right to Restrict</strong> - Limit data processing</li>
                                </ul>
                            </div>
                        </div>
                        <p className="small text-muted">
                            *Medical records may be retained for legal and safety reasons even after account deletion
                        </p>
                    </div>

                    <div className="gdpr-contact-custom">
                        <div className="alert">
                            <h6><i className="fas fa-envelope me-2"></i>Data Protection Contact</h6>
                            <p style={{marginBottom: 0}}>
                                For any questions about your data or to exercise your GDPR rights, contact our Data Protection Officer at: 
                                <strong> dpo@carelink.be</strong>
                            </p>
                        </div>
                    </div>

                    <div className="gdpr-retention-custom">
                        <h6><i className="fas fa-clock me-2"></i>Data Retention</h6>
                        <p className="small">
                            Personal data is retained for as long as necessary to provide services, comply with legal obligations, 
                            and resolve disputes. Medical data is retained according to healthcare regulations (typically 10-30 years).
                        </p>
                    </div>
                </div>
                
                <div className="gdpr-modal-footer-custom">
                    <div className="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>Consent is Mandatory:</strong> You must accept these terms to create a CareLink account and access healthcare services.
                    </div>
                    <div className="gdpr-buttons-container">
                        <button 
                            className="btn btn-decline" 
                            onClick={onDecline}
                            type="button"
                        >
                            <i className="fas fa-times me-2"></i>
                            Decline & Cancel
                        </button>
                        <button 
                            className="btn btn-accept" 
                            onClick={onAccept}
                            type="button"
                        >
                            <i className="fas fa-check me-2"></i>
                            I Accept GDPR Terms & Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GdprModal;
