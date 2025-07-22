import React, { useState, useEffect, useContext } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import { AdminContext } from '../../auth/login/AdminContext';
import TokenManager from '../../utils/tokenManager';
import './CommunicationPanel.css';

const CommunicationPanel = () => {
    const { userData } = useContext(AdminContext);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Get user role from userData
    const userRole = userData?.user?.role;
    
    // Statistics state
    const [stats, setStats] = useState({
        emails: {
            sent: 0,
            failed: 0,
            pending: 0
        },
        sms: {
            sent: 0,
            failed: 0,
            pending: 0
        },
        weekly: {
            lastSent: null,
            nextScheduled: null
        }
    });
    const [weeklyResults, setWeeklyResults] = useState(null);
    
    // SMS Management state
    const [smsLogs, setSmsLogs] = useState([]);
    const [loadingSmsLogs, setLoadingSmsLogs] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null); // For showing full SMS message
    const [showFailedOnly, setShowFailedOnly] = useState(false); // Filter for failed SMS
    const [testPhone, setTestPhone] = useState({
        phoneNumber: '',
        message: 'Test SMS - checking phone number validation',
        loading: false,
        result: null
    });
    const [individualSms, setIndividualSms] = useState({
        userEmail: '',
        message: '',
        loading: false,
        result: null
    });
    const [retryWeekly, setRetryWeekly] = useState({
        userEmail: '',
        weekOffset: 1, // 1 = next week, 0 = current week
        loading: false,
        result: null
    });

    // Close notification handlers
    const closeError = () => setError('');
    const closeIndividualSmsResult = () => setIndividualSms(prev => ({ ...prev, result: null }));
    const closeRetryWeeklyResult = () => setRetryWeekly(prev => ({ ...prev, result: null }));
    const closeWeeklyResults = () => setWeeklyResults(null);
    const closeTestPhoneResult = () => setTestPhone(prev => ({ ...prev, result: null }));

    // Test error generator
    const generateTestError = () => {
        setError('Test Error: This is a sample error message to demonstrate the close button functionality. You can now click the × button to close this notification.');
    };

    const handleTestSmsWithPhone = async () => {
        try {
            setTestPhone(prev => ({ ...prev, loading: true, result: null }));
            
            const response = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/test-sms-phone/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: testPhone.phoneNumber,
                    message: testPhone.message
                })
            });

            const data = await response.json();
            setTestPhone(prev => ({ 
                ...prev, 
                result: data
            }));
            
            if (data.success) {
                // Refresh SMS logs and stats
                fetchSmsLogs();
                fetchCommunicationStats();
            }
        } catch (error) {
            console.error('Error testing SMS with phone:', error);
            setTestPhone(prev => ({ 
                ...prev, 
                result: { success: false, error: 'Failed to test SMS' }
            }));
        } finally {
            setTestPhone(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchCommunicationStats();
    }, []);

    const fetchCommunicationStats = async () => {
        try {
            setLoading(true);
            const response = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/stats/');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching communication stats:', error);
            setError('Failed to load communication statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleSendWeeklyNotifications = async (weekOffset = 1) => {
        try {
            setLoading(true);
            setError('');
            
            const response = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/send-weekly/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    week_offset: weekOffset
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setWeeklyResults(data.summary);
                    // Refresh stats after sending
                    fetchCommunicationStats();
                } else {
                    setError(data.error || 'Failed to send weekly notifications');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to send weekly notifications');
            }
        } catch (error) {
            console.error('Error sending weekly notifications:', error);
            setError('Failed to send weekly notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchSmsLogs = async () => {
        try {
            setLoadingSmsLogs(true);
            const response = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/sms-logs/');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSmsLogs(data.logs);
                }
            }
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
        } finally {
            setLoadingSmsLogs(false);
        }
    };

    const handleSendIndividualSms = async () => {
        try {
            setIndividualSms(prev => ({ ...prev, loading: true, result: null }));
            
            const response = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/send-individual-sms/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_email: individualSms.userEmail,
                    message: individualSms.message
                })
            });

            const data = await response.json();
            setIndividualSms(prev => ({ 
                ...prev, 
                result: data,
                userEmail: data.success ? '' : prev.userEmail,
                message: data.success ? '' : prev.message
            }));
            
            if (data.success) {
                // Refresh SMS logs and stats
                fetchSmsLogs();
                fetchCommunicationStats();
            }
        } catch (error) {
            console.error('Error sending individual SMS:', error);
            setIndividualSms(prev => ({ 
                ...prev, 
                result: { success: false, error: 'Failed to send SMS' }
            }));
        } finally {
            setIndividualSms(prev => ({ ...prev, loading: false }));
        }
    };

    const handleRetryWeeklySms = async () => {
        try {
            setRetryWeekly(prev => ({ ...prev, loading: true, result: null }));
            
            // First, get the user's weekly appointments
            const appointmentsResponse = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/weekly-appointments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    week_offset: retryWeekly.weekOffset,
                    user_email: retryWeekly.userEmail
                })
            });
            
            if (appointmentsResponse.ok) {
                const appointmentsData = await appointmentsResponse.json();
                if (appointmentsData.success && appointmentsData.message) {
                    // Send the generated weekly message via individual SMS
                    const smsResponse = await TokenManager.authenticatedFetch('http://localhost:8000/account/communication/send-individual-sms/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_email: retryWeekly.userEmail,
                            message: appointmentsData.message
                        })
                    });
                    
                    const smsData = await smsResponse.json();
                    setRetryWeekly(prev => ({ 
                        ...prev, 
                        result: {
                            ...smsData,
                            message: appointmentsData.message,
                            weekInfo: `${appointmentsData.week_start} to ${appointmentsData.week_end}`
                        },
                        userEmail: smsData.success ? '' : prev.userEmail
                    }));
                    
                    if (smsData.success) {
                        fetchSmsLogs();
                        fetchCommunicationStats();
                    }
                } else {
                    setRetryWeekly(prev => ({ 
                        ...prev, 
                        result: { 
                            success: false, 
                            error: appointmentsData.error || 'No appointments found for this user/week' 
                        }
                    }));
                }
            } else {
                setRetryWeekly(prev => ({ 
                    ...prev, 
                    result: { success: false, error: 'Failed to get weekly appointments' }
                }));
            }
        } catch (error) {
            console.error('Error retrying weekly SMS:', error);
            setRetryWeekly(prev => ({ 
                ...prev, 
                result: { success: false, error: 'Failed to retry weekly SMS' }
            }));
        } finally {
            setRetryWeekly(prev => ({ ...prev, loading: false }));
        }
    };

    // Load SMS logs when SMS tab is activated
    useEffect(() => {
        if (activeTab === 'sms') {
            fetchSmsLogs();
        }
    }, [activeTab]);

    const renderDashboard = () => (
        <div className="communication-management-dashboard">
            <div className="comm-dashboard-header">
                <h2>Communication Center Dashboard</h2>
                <p>Comprehensive overview of all email and SMS communications</p>
            </div>

            {/* Main Statistics Row */}
            <div className="comm-main-stats">
                <div className="comm-stats-row">
                    {/* Email Statistics */}
                    <div className="comm-stat-card comm-email-stats">
                        <div className="comm-stat-header">
                            <h3>📧 Email Today</h3>
                        </div>
                        <div className="comm-stat-content">
                            <div className="comm-stat-big-number success">{stats.emails.sent}</div>
                            <div className="comm-stat-label">Sent Successfully</div>
                            <div className="comm-stat-secondary">
                                <span className="error">{stats.emails.failed} Failed</span>
                                <span className="warning">{stats.emails.pending} Pending</span>
                            </div>
                        </div>
                    </div>

                    {/* SMS Statistics */}
                    <div className="comm-stat-card comm-sms-stats">
                        <div className="comm-stat-header">
                            <h3>📱 SMS Today</h3>
                        </div>
                        <div className="comm-stat-content">
                            <div className="comm-stat-big-number success">{stats.sms.sent}</div>
                            <div className="comm-stat-label">Sent Successfully</div>
                            <div className="comm-stat-secondary">
                                <span className="error">{stats.sms.failed} Failed</span>
                                <span className="warning">{stats.sms.pending} Pending</span>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Summary */}
                    <div className="comm-stat-card comm-weekly-stats">
                        <div className="comm-stat-header">
                            <h3>� Weekly Summary</h3>
                        </div>
                        <div className="comm-stat-content">
                            {weeklyResults ? (
                                <>
                                    <div className="comm-stat-big-number success">{weeklyResults.total_sent}</div>
                                    <div className="comm-stat-label">Last Weekly SMS</div>
                                    <div className="comm-stat-secondary">
                                        <span className="error">{weeklyResults.total_failed} Failed</span>
                                        <span className="warning">{weeklyResults.total_skipped} Skipped</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="comm-stat-big-number neutral">-</div>
                                    <div className="comm-stat-label">No Recent Weekly SMS</div>
                                    <div className="comm-stat-secondary">
                                        <span>Ready to Send</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Weekly Results */}
            {weeklyResults && (
                <div className="comm-weekly-results-dashboard">
                    <h3>� Latest Weekly SMS Results</h3>
                    <div className="comm-results-grid">
                        <div className="comm-result-detail">
                            <h4>👤 Patients</h4>
                            <div className="comm-result-numbers">
                                <span className="success">✅ {weeklyResults.patients.sent}</span>
                                <span className="error">❌ {weeklyResults.patients.failed}</span>
                                <span className="warning">⏭️ {weeklyResults.patients.skipped}</span>
                            </div>
                        </div>
                        <div className="comm-result-detail">
                            <h4>👩‍⚕️ Providers</h4>
                            <div className="comm-result-numbers">
                                <span className="success">✅ {weeklyResults.providers.sent}</span>
                                <span className="error">❌ {weeklyResults.providers.failed}</span>
                                <span className="warning">⏭️ {weeklyResults.providers.skipped}</span>
                            </div>
                        </div>
                        <div className="comm-result-detail">
                            <h4>📅 Week Period</h4>
                            <div className="comm-week-info">
                                <span>{weeklyResults.week_start}</span>
                                <span>to</span>
                                <span>{weeklyResults.week_end}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions Section */}
            <div className="comm-dashboard-actions">
                <h3>⚡ Quick Actions</h3>
                <div className="comm-action-grid">
                    <div className="comm-action-card">
                        <h4>📧 Email Management</h4>
                        <p>Send test emails and manage email communications</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setActiveTab('email')}
                        >
                            Manage Emails
                        </button>
                    </div>
                    
                    <div className="comm-action-card">
                        <h4>📱 SMS Management</h4>
                        <p>View SMS logs, send individual messages, and retry failed SMS</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setActiveTab('sms')}
                        >
                            Manage SMS
                        </button>
                    </div>
                    
                    <div className="comm-action-card">
                        <h4>📅 Weekly Notifications</h4>
                        <p>Send weekly appointment summaries to patients and providers</p>
                        <button 
                            className="btn btn-success"
                            onClick={() => setActiveTab('weekly')}
                        >
                            Send Weekly Summary
                        </button>
                    </div>
                </div>
            </div>

            {/* Test Section for Real Error Generation */}
            <div className="comm-dashboard-test-section">
                <h3>🧪 Test Real Error Scenarios</h3>
                <p>Generate actual errors from the SMS system to test error handling and close buttons</p>
                
                {/* Direct Phone Number Test */}
                <div className="comm-phone-test-section">
                    <h4>📞 Test Phone Number Directly</h4>
                    <p>Test SMS sending with specific phone numbers to see Twilio error responses</p>
                    <div className="comm-phone-test-form">
                        <div className="form-group">
                            <label htmlFor="testPhoneNumber">Phone Number:</label>
                            <input
                                id="testPhoneNumber"
                                type="text"
                                className="form-control"
                                placeholder="e.g. +32123456789, 0123456789, invalid-number"
                                value={testPhone.phoneNumber}
                                onChange={(e) => setTestPhone(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            />
                            <small className="form-text text-muted">
                                Try: "invalid", "123", "+1234", "0000000000" to see different Twilio errors
                            </small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="testPhoneMessage">Message:</label>
                            <textarea
                                id="testPhoneMessage"
                                className="form-control"
                                rows="2"
                                value={testPhone.message}
                                onChange={(e) => setTestPhone(prev => ({ ...prev, message: e.target.value }))}
                            />
                        </div>
                        <button 
                            className="btn btn-warning"
                            onClick={handleTestSmsWithPhone}
                            disabled={!testPhone.phoneNumber || testPhone.loading}
                        >
                            {testPhone.loading ? (
                                <>
                                    <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                                    Testing...
                                </>
                            ) : (
                                '📞 Test Phone Number'
                            )}
                        </button>
                    </div>
                    
                    {/* Test Phone Results */}
                    {testPhone.result && (
                        <div className={`comm-test-phone-result ${testPhone.result.success ? 'success' : 'error'}`}>
                            <div className="comm-notification-header">
                                {testPhone.result.success ? (
                                    <div>
                                        <strong>✅ SMS Sent Successfully!</strong>
                                        <p>Phone: {testPhone.result.phone} → {testPhone.result.formatted_phone}</p>
                                        <p>Message SID: {testPhone.result.message_sid}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <strong>❌ SMS Failed - Twilio Error</strong>
                                        <p>Phone: {testPhone.result.phone}</p>
                                        <p className="error-detail">
                                            <strong>Twilio Error:</strong> {testPhone.result.error}
                                        </p>
                                    </div>
                                )}
                                <button 
                                    type="button" 
                                    className="comm-notification-close" 
                                    onClick={closeTestPhoneResult}
                                    aria-label="Close notification"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="comm-test-buttons">
                    <button 
                        className="btn btn-outline-danger"
                        onClick={() => {
                            // Test with invalid email
                            setIndividualSms({
                                userEmail: 'invalid-email-address',
                                message: 'Test message',
                                loading: false,
                                result: null
                            });
                            // Trigger the SMS send which will fail
                            setTimeout(() => {
                                handleSendIndividualSms();
                            }, 100);
                        }}
                    >
                        🔴 Test Invalid Email Error
                    </button>
                    <button 
                        className="btn btn-outline-warning"
                        onClick={() => {
                            // Test with empty message
                            setIndividualSms({
                                userEmail: 'test@example.com',
                                message: '',
                                loading: false,
                                result: null
                            });
                            // Trigger the SMS send which will fail validation
                            setTimeout(() => {
                                handleSendIndividualSms();
                            }, 100);
                        }}
                    >
                        ⚠️ Test Empty Message Error
                    </button>
                    <button 
                        className="btn btn-outline-secondary"
                        onClick={() => {
                            // Test with non-existent user
                            setIndividualSms({
                                userEmail: 'nonexistent.user@nowhere.com',
                                message: 'Test message for non-existent user',
                                loading: false,
                                result: null
                            });
                            // Trigger the SMS send which will fail
                            setTimeout(() => {
                                handleSendIndividualSms();
                            }, 100);
                        }}
                    >
                        👤 Test User Not Found Error
                    </button>
                    <button 
                        className="btn btn-outline-info"
                        onClick={() => {
                            // Test weekly SMS with invalid email
                            setRetryWeekly({
                                userEmail: 'invalid-weekly-email',
                                weekOffset: 1,
                                loading: false,
                                result: null
                            });
                            // Trigger the weekly SMS retry which will fail
                            setTimeout(() => {
                                handleRetryWeeklySms();
                            }, 100);
                        }}
                    >
                        📅 Test Weekly SMS Error
                    </button>
                    <button 
                        className="btn btn-outline-warning"
                        onClick={() => {
                            // Test with invalid phone number format
                            setIndividualSms({
                                userEmail: 'test@example.com', // Use a real email but we'll force invalid phone
                                message: 'Test message with invalid phone number',
                                loading: false,
                                result: null
                            });
                            // We need to create a test endpoint for invalid phone, for now use direct SMS
                            setTimeout(() => {
                                // This will try to send to a user without a phone number
                                handleSendIndividualSms();
                            }, 100);
                        }}
                    >
                        📞 Test Invalid Phone Number
                    </button>
                    <button 
                        className="btn btn-outline-success"
                        onClick={generateTestError}
                    >
                        💬 Test UI Error Message
                    </button>
                </div>
                <div className="comm-test-instructions">
                    <small>
                        <strong>Instructions:</strong> Use the phone test above to see exact Twilio error messages, or click the buttons below for other error scenarios. 
                        After errors appear, test the close button (×) functionality.
                    </small>
                </div>
            </div>
        </div>
    );

    const renderEmailPanel = () => (
        <div className="comm-email-panel">
            <h2>📧 Email Management</h2>
            <p>Email functionality will be implemented here</p>
        </div>
    );

    const renderSMSPanel = () => (
        <div className="comm-sms-panel">
            <h2>📱 SMS Management Center</h2>
            <p>Comprehensive SMS operations, logs, and individual message sending</p>
            
            {/* SMS Statistics Overview */}
            <div className="comm-sms-stats">
                <h3>📊 SMS Statistics (Today)</h3>
                <div className="comm-stats-row">
                    <div className="comm-stat-box success">
                        <strong>{stats.sms.sent}</strong>
                        <span>Sent</span>
                    </div>
                    <div className="comm-stat-box error">
                        <strong>{stats.sms.failed}</strong>
                        <span>Failed</span>
                    </div>
                    <div className="comm-stat-box warning">
                        <strong>{stats.sms.pending}</strong>
                        <span>Pending</span>
                    </div>
                </div>
            </div>

            {/* Weekly SMS Retry Section */}
            <div className="comm-weekly-retry">
                <h3>🔄 Retry Weekly SMS</h3>
                <p>Regenerate and send weekly appointment SMS for a specific user (useful after fixing phone numbers)</p>
                
                <div className="comm-retry-form">
                    <div className="form-group">
                        <label htmlFor="retryUserEmail">User Email:</label>
                        <input
                            type="email"
                            id="retryUserEmail"
                            className="form-control"
                            placeholder="Enter user email (e.g., alexander@carelink.be)"
                            value={retryWeekly.userEmail}
                            onChange={(e) => setRetryWeekly(prev => ({ ...prev, userEmail: e.target.value }))}
                            disabled={retryWeekly.loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="weekOffset">Week to send:</label>
                        <select
                            id="weekOffset"
                            className="form-control"
                            value={retryWeekly.weekOffset}
                            onChange={(e) => setRetryWeekly(prev => ({ ...prev, weekOffset: parseInt(e.target.value) }))}
                            disabled={retryWeekly.loading}
                        >
                            <option value={0}>📅 Current Week</option>
                            <option value={1}>📅 Next Week</option>
                        </select>
                    </div>
                    
                    <button
                        className="btn btn-warning"
                        onClick={handleRetryWeeklySms}
                        disabled={retryWeekly.loading || !retryWeekly.userEmail}
                    >
                        {retryWeekly.loading ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Generating & Sending...
                            </>
                        ) : (
                            '🔄 Retry Weekly SMS'
                        )}
                    </button>
                </div>
                
                {/* Retry Results */}
                {retryWeekly.result && (
                    <div className={`comm-retry-result ${retryWeekly.result.success ? 'success' : 'error'}`}>
                        <div className="comm-notification-header">
                            {retryWeekly.result.success ? (
                                <div>
                                    <strong>✅ Weekly SMS Sent Successfully!</strong>
                                    <p>To: {retryWeekly.result.user} ({retryWeekly.result.phone})</p>
                                    <p>Week: {retryWeekly.result.weekInfo}</p>
                                    <p>Message SID: {retryWeekly.result.message_sid}</p>
                                    <details>
                                        <summary>📱 SMS Message Preview</summary>
                                        <pre className="sms-preview">{retryWeekly.result.message}</pre>
                                    </details>
                                </div>
                            ) : (
                                <div>
                                    <strong>❌ Weekly SMS Failed</strong>
                                    <p>Error: {retryWeekly.result.error}</p>
                                </div>
                            )}
                            <button 
                                type="button" 
                                className="comm-notification-close" 
                                onClick={closeRetryWeeklyResult}
                                aria-label="Close notification"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="comm-individual-sms">
                <h3>📲 Send Individual SMS</h3>
                <p>Send SMS to a specific user (useful for manual corrections after issues)</p>
                
                <div className="comm-sms-form">
                    <div className="form-group">
                        <label htmlFor="userEmail">User Email:</label>
                        <input
                            type="email"
                            id="userEmail"
                            className="form-control"
                            placeholder="Enter user email (e.g., alice@carelink.be)"
                            value={individualSms.userEmail}
                            onChange={(e) => setIndividualSms(prev => ({ ...prev, userEmail: e.target.value }))}
                            disabled={individualSms.loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="smsMessage">SMS Message:</label>
                        <textarea
                            id="smsMessage"
                            className="form-control"
                            rows="4"
                            placeholder="Enter your SMS message..."
                            value={individualSms.message}
                            onChange={(e) => setIndividualSms(prev => ({ ...prev, message: e.target.value }))}
                            disabled={individualSms.loading}
                            maxLength="160"
                        />
                        <small className="text-muted">
                            {individualSms.message.length}/160 characters
                        </small>
                    </div>
                    
                    <button
                        className="btn btn-primary"
                        onClick={handleSendIndividualSms}
                        disabled={individualSms.loading || !individualSms.userEmail || !individualSms.message}
                    >
                        {individualSms.loading ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Sending...
                            </>
                        ) : (
                            '📤 Send SMS'
                        )}
                    </button>
                </div>
                
                {/* Individual SMS Results */}
                {individualSms.result && (
                    <div className={`comm-sms-result ${individualSms.result.success ? 'success' : 'error'}`}>
                        <div className="comm-notification-header">
                            {individualSms.result.success ? (
                                <div>
                                    <strong>✅ SMS Sent Successfully!</strong>
                                    <p>To: {individualSms.result.user} ({individualSms.result.phone})</p>
                                    <p>Message SID: {individualSms.result.message_sid}</p>
                                </div>
                            ) : (
                                <div>
                                    <strong>❌ SMS Failed</strong>
                                    <p>Error: {individualSms.result.error}</p>
                                    {individualSms.result.user && <p>User: {individualSms.result.user}</p>}
                                    {individualSms.result.phone && <p>Phone: {individualSms.result.phone}</p>}
                                </div>
                            )}
                            <button 
                                type="button" 
                                className="comm-notification-close" 
                                onClick={closeIndividualSmsResult}
                                aria-label="Close notification"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SMS Logs Section */}
            <div className="comm-sms-logs">
                <div className="comm-logs-header">
                    <div className="comm-logs-title-section">
                        <h3>📋 Recent SMS Logs</h3>
                        <div className="comm-logs-filters">
                            <button
                                className={`btn btn-sm ${showFailedOnly ? 'btn-danger' : 'btn-outline-danger'}`}
                                onClick={() => setShowFailedOnly(!showFailedOnly)}
                            >
                                {showFailedOnly ? '❌ Show All' : '🚨 Show Failures Only'}
                            </button>
                        </div>
                    </div>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchSmsLogs}
                        disabled={loadingSmsLogs}
                    >
                        {loadingSmsLogs ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                                Loading...
                            </>
                        ) : (
                            '🔄 Refresh Logs'
                        )}
                    </button>
                </div>
                
                <div className="comm-logs-table-container">
                    {loadingSmsLogs ? (
                        <div className="text-center p-4">
                            <div className="spinner-border" role="status">
                                <span className="sr-only">Loading SMS logs...</span>
                            </div>
                        </div>
                    ) : smsLogs.length > 0 ? (
                        <table className="table table-striped comm-logs-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Recipient</th>
                                    <th>Status</th>
                                    <th>Message Preview</th>
                                    <th>Type</th>
                                    <th>Error</th>
                                    <th>External ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {smsLogs
                                    .filter(log => !showFailedOnly || log.status === 'failed')
                                    .map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr 
                                            className="comm-log-row"
                                            onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="comm-log-time">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="comm-log-recipient">
                                                {log.recipient}
                                            </td>
                                            <td>
                                                <span className={`comm-status-badge ${log.status}`}>
                                                    {log.status === 'sent' ? '✅' : log.status === 'failed' ? '❌' : '⏳'} 
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="comm-log-message">
                                                {log.message_preview}
                                                {log.full_message && log.full_message.length > 100 && (
                                                    <small className="text-muted"> (click to expand)</small>
                                                )}
                                            </td>
                                            <td>
                                                <span className="comm-type-badge">
                                                    {log.metadata?.notification_type === 'weekly_summary' ? '📅 Weekly' : 
                                                     log.metadata?.notification_type === 'manual_individual' ? '📲 Manual' : 
                                                     '📱 SMS'}
                                                </span>
                                            </td>
                                            <td className="comm-log-error">
                                                {log.error_message ? (
                                                    <span className="comm-error-detail" title={log.error_message}>
                                                        <span className="comm-error-icon">🚨</span>
                                                        <span className="comm-error-text">
                                                            {log.error_message.length > 50 
                                                                ? log.error_message.substring(0, 47) + '...' 
                                                                : log.error_message}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="comm-success-indicator">✓</span>
                                                )}
                                            </td>
                                            <td className="comm-log-sid">
                                                {log.external_id ? (
                                                    <code>{log.external_id.substring(0, 10)}...</code>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                        {/* Expandable full message row */}
                                        {selectedLog === log.id && log.full_message && (
                                            <tr key={`${log.id}-details`}>
                                                <td colSpan="7" className="comm-log-details">
                                                    <div className="comm-full-message">
                                                        <strong>📱 Full SMS Message:</strong>
                                                        <pre className="sms-full-content">{log.full_message}</pre>
                                                        <div className="sms-actions">
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRetryWeekly(prev => ({
                                                                        ...prev,
                                                                        userEmail: log.recipient
                                                                    }));
                                                                }}
                                                            >
                                                                🔄 Retry for this user
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(log.full_message);
                                                                }}
                                                            >
                                                                📋 Copy Message
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center p-4 text-muted">
                            <p>No SMS logs found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="comm-sms-actions">
                <h3>⚡ Quick Actions</h3>
                <div className="comm-action-grid">
                    <button
                        className="btn btn-outline-info"
                        onClick={() => setActiveTab('weekly')}
                    >
                        📅 Go to Weekly SMS
                    </button>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={fetchCommunicationStats}
                    >
                        📊 Refresh Stats
                    </button>
                </div>
            </div>
        </div>
    );

    const renderWeeklyPanel = () => (
        <div className="comm-weekly-panel">
            <h2>📅 Weekly Appointment Notifications</h2>
            <p>Send weekly SMS summaries to patients and providers</p>
            
            <div className="comm-weekly-controls">
                <div className="comm-weekly-info">
                    <h4>How it works:</h4>
                    <ul>
                        <li>📱 <strong>Patients:</strong> Receive SMS with their appointments for next week</li>
                        <li>👩‍⚕️ <strong>Providers:</strong> Receive SMS with their patient appointments for next week</li>
                        <li>⚙️ <strong>SMS Preference:</strong> Only users with SMS preference will receive messages</li>
                        <li>⏰ <strong>Timing:</strong> Typically sent Saturday 6:00 PM for the following week</li>
                    </ul>
                </div>
                
                <div className="comm-weekly-actions">
                    <h4>Send Weekly Notifications:</h4>
                    <div className="comm-action-buttons">
                        <button 
                            className="btn btn-primary comm-send-weekly-btn"
                            onClick={() => handleSendWeeklyNotifications(1)}
                            disabled={loading}
                        >
                            📅 Send for Next Week
                        </button>
                        <button 
                            className="btn btn-outline-secondary"
                            onClick={() => handleSendWeeklyNotifications(0)}
                            disabled={loading}
                        >
                            📅 Send for Current Week (Test)
                        </button>
                    </div>
                    
                    {loading && (
                        <div className="comm-loading-inline">
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="sr-only">Sending...</span>
                            </div>
                            <span className="ms-2">Sending weekly notifications...</span>
                        </div>
                    )}
                </div>
                
                {weeklyResults && (
                    <div className="comm-weekly-results">
                        <div className="comm-results-header">
                            <h4>Last Sending Results:</h4>
                            <button 
                                type="button" 
                                className="comm-notification-close" 
                                onClick={closeWeeklyResults}
                                aria-label="Close results"
                            >
                                ×
                            </button>
                        </div>
                        <div className="comm-results-summary">
                            <div className="comm-result-card success">
                                <strong>{weeklyResults.total_sent}</strong>
                                <span>SMS Sent</span>
                            </div>
                            <div className="comm-result-card error">
                                <strong>{weeklyResults.total_failed}</strong>
                                <span>Failed</span>
                            </div>
                            <div className="comm-result-card warning">
                                <strong>{weeklyResults.total_skipped}</strong>
                                <span>Skipped (No SMS Preference)</span>
                            </div>
                        </div>
                        
                        <div className="comm-results-details">
                            <div className="comm-result-section">
                                <h5>👤 Patients:</h5>
                                <span>Sent: {weeklyResults.patients.sent}, Failed: {weeklyResults.patients.failed}, Skipped: {weeklyResults.patients.skipped}</span>
                            </div>
                            <div className="comm-result-section">
                                <h5>👩‍⚕️ Providers:</h5>
                                <span>Sent: {weeklyResults.providers.sent}, Failed: {weeklyResults.providers.failed}, Skipped: {weeklyResults.providers.skipped}</span>
                            </div>
                            <div className="comm-result-section">
                                <h5>📅 Week:</h5>
                                <span>{weeklyResults.week_start} to {weeklyResults.week_end}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <BaseLayout>
            <div className="communication-management-panel">
                <div className="comm-panel-header">
                    <nav className="communication-management-nav">
                        <button 
                            className={`comm-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                    >
                        🏠 Dashboard
                    </button>
                    <button 
                        className={`comm-nav-btn ${activeTab === 'email' ? 'active' : ''}`}
                        onClick={() => setActiveTab('email')}
                    >
                        📧 Email
                    </button>
                    <button 
                        className={`comm-nav-btn ${activeTab === 'sms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sms')}
                    >
                        📱 SMS
                    </button>
                    <button 
                        className={`comm-nav-btn ${activeTab === 'weekly' ? 'active' : ''}`}
                        onClick={() => setActiveTab('weekly')}
                    >
                        📅 Weekly
                    </button>
                </nav>
            </div>

            <div className="comm-panel-content">
                {error && (
                    <div className="comm-alert comm-alert-danger">
                        <div className="comm-alert-content">
                            <span>{error}</span>
                            <button 
                                type="button" 
                                className="comm-alert-close" 
                                onClick={closeError}
                                aria-label="Close notification"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="comm-loading-container">
                        <div className="spinner-border" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>
                        <p>Loading communication data...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'email' && renderEmailPanel()}
                        {activeTab === 'sms' && renderSMSPanel()}
                        {activeTab === 'weekly' && renderWeeklyPanel()}
                    </>
                )}
            </div>
            </div>
        </BaseLayout>
    );
};

export default CommunicationPanel;
