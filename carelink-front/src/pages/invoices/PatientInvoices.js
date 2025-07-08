import React, { useEffect, useState, useContext } from 'react';
import { fetchPatientInvoices, fetchInvoiceDetail, contestInvoice, fetchInvoiceLines } from '../../services/invoiceService';
import { AdminContext } from '../../auth/login/AdminContext';
import { getValidAccessToken } from '../../utils/tokenManager';
import BaseLayout from '../../auth/layout/BaseLayout';
import './PatientInvoices.css';

const API_BASE = 'http://localhost:8000/account';

async function getPatientIdFromProfile() {
  console.log('🔍 [PatientInvoices] Starting profile fetch...');
  try {
    const token = await getValidAccessToken();
    console.log('🔑 [PatientInvoices] Token received:', token ? 'Valid token present' : 'No token');
    
    const response = await fetch(`${API_BASE}/profile/`, { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📡 [PatientInvoices] Profile response status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ [PatientInvoices] Profile fetch failed:', { status: response.status, error: text });
      throw new Error(`Failed to fetch profile: ${response.status} - ${text}`);
    }
    
    const data = await response.json();
    console.log('👤 [PatientInvoices] Profile data:', {
      hasUser: !!data.user,
      userRole: data.user?.role,
      hasPatient: !!data.patient,
      patientId: data.patient?.id
    });
    
    if (!data.patient?.id) {
      console.log('ℹ️ [PatientInvoices] No patient ID in profile. User role:', data.user?.role);
      if (data.user?.role === 'FamilyPatient') {
        console.log('👨‍👩‍👧‍👦 [PatientInvoices] User is FamilyPatient, will use /my-invoices/ endpoint');
        return null;
      } else {
        throw new Error('You do not have access to invoices. Please contact support if you think this is an error.');
      }
    }
    
    return data.patient?.id;
  } catch (error) {
    console.error('❌ [PatientInvoices] Profile fetch error:', error);
    throw error;
  }
}

const PatientInvoices = ({ patientId }) => {
  console.log('🏁 [PatientInvoices] Component mounting with props:', { patientId });
  
  const { userData } = useContext(AdminContext);
  console.log('👤 [PatientInvoices] AdminContext userData:', userData);
  
  const [effectivePatientId, setEffectivePatientId] = useState(patientId);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Contest modal state
  const [showContestModal, setShowContestModal] = useState(false);
  const [contestInvoiceId, setContestInvoiceId] = useState(null);
  const [contestReason, setContestReason] = useState('');
  const [contestLoading, setContestLoading] = useState(false);
  const [contestError, setContestError] = useState(null);
  
  // Timeslots state
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [selectedTimeslots, setSelectedTimeslots] = useState([]);
  const [searchDate, setSearchDate] = useState('');
  const [filteredLines, setFilteredLines] = useState([]);

  // Helper function to calculate duration in hours
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    try {
      // Parse time strings (e.g., "08:00:00" or "08:00")
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      // Convert to total minutes
      const startTotalMin = startHour * 60 + (startMin || 0);
      const endTotalMin = endHour * 60 + (endMin || 0);
      
      // Calculate difference in minutes and convert to hours
      const diffMin = endTotalMin - startTotalMin;
      const hours = diffMin / 60;
      
      return Math.round(hours * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.warn('Error calculating duration:', error, { startTime, endTime });
      return 0;
    }
  };

  useEffect(() => {
    console.log('🔄 [PatientInvoices] Initial useEffect running', {
      patientId,
      userData,
      hasPatientInUserData: !!userData?.patient?.id
    });
    
    if (!patientId) {
      if (userData?.patient?.id) {
        console.log('✅ [PatientInvoices] Using patient ID from AdminContext:', userData.patient.id);
        setEffectivePatientId(userData.patient.id);
      } else {
        console.log('🔍 [PatientInvoices] No patientId in AdminContext, fetching from profile...');
        getPatientIdFromProfile()
          .then(pid => {
            console.log('✅ [PatientInvoices] Got patientId from profile:', pid);
            setEffectivePatientId(pid);
          })
          .catch(err => {
            console.error('❌ [PatientInvoices] Error fetching profile:', err);
            setError(err.message);
            setLoading(false);
          });
      }
    } else {
      console.log('✅ [PatientInvoices] Using provided patientId:', patientId);
      setEffectivePatientId(patientId);
    }
  }, [patientId, userData]);

  useEffect(() => {
    if (!effectivePatientId && effectivePatientId !== null) {
      console.log('⏳ [PatientInvoices] Waiting for effectivePatientId...');
      return;
    }
    
    console.log('🔄 [PatientInvoices] Starting invoice fetch for patientId:', effectivePatientId);
    setLoading(true);
    setError(null);
    
    fetchPatientInvoices(effectivePatientId)
      .then(data => {
        console.log('✅ [PatientInvoices] Fetched invoices:', {
          isArray: Array.isArray(data),
          count: Array.isArray(data) ? data.length : 'not an array',
          data: data
        });
        
        // Ensure we have an array of invoices
        const invoicesArray = Array.isArray(data) ? data : [];
        console.log('✅ [PatientInvoices] Processed invoices array:', {
          count: invoicesArray.length,
          data: invoicesArray
        });
        
        setInvoices(invoicesArray);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ [PatientInvoices] Error fetching invoices:', err);
        setError(err.message);
        setLoading(false);
        setInvoices([]);
      });
  }, [effectivePatientId]);

  const handleViewDetail = (invoiceId) => {
    console.debug('[PatientInvoices] Viewing detail for invoice:', invoiceId);
    setDetailLoading(true);
    setSelectedInvoice(invoiceId);
    fetchInvoiceDetail(invoiceId)
      .then(data => {
        console.debug('[PatientInvoices] Fetched invoice detail:', data);
        setInvoiceDetail(data);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error('[PatientInvoices] Error fetching invoice detail:', err);
        setError(err.message);
        setDetailLoading(false);
      });
  };

  const handleContest = async (invoiceId) => {
    console.debug('[PatientInvoices] Opening contest modal for invoice:', invoiceId);
    setContestInvoiceId(invoiceId);
    setContestReason('');
    setContestError(null);
    setSelectedTimeslots([]);
    setSearchDate('');
    setShowContestModal(true);
    
    // Fetch invoice lines
    setLinesLoading(true);
    try {
      const lines = await fetchInvoiceLines(invoiceId);
      console.debug('[PatientInvoices] Fetched invoice lines:', lines);
      setInvoiceLines(lines);
      setFilteredLines(lines);
    } catch (err) {
      console.error('[PatientInvoices] Error fetching invoice lines:', err);
      setContestError('Failed to load invoice details. Please try again.');
      setInvoiceLines([]);
      setFilteredLines([]);
    } finally {
      setLinesLoading(false);
    }
  };

  const handleDateSearch = (date) => {
    console.debug('[PatientInvoices] Filtering by date:', date);
    setSearchDate(date);
    if (!date || date.trim() === '') {
      console.debug('[PatientInvoices] No date filter, showing all lines');
      setFilteredLines(invoiceLines);
    } else {
      console.debug('[PatientInvoices] Filtering lines by date:', date);
      const filtered = invoiceLines.filter(line => 
        line.date === date  // Using exact date match
      );
      console.debug(`[PatientInvoices] Found ${filtered.length} lines for date ${date}`);
      setFilteredLines(filtered);
    }
  };

  const handleTimeslotSelection = (lineId) => {
    setSelectedTimeslots(prev => {
      if (prev.includes(lineId)) {
        return prev.filter(id => id !== lineId);
      } else {
        return [...prev, lineId];
      }
    });
  };

  const handleSelectAllTimeslots = () => {
    if (selectedTimeslots.length === filteredLines.length) {
      setSelectedTimeslots([]);
    } else {
      setSelectedTimeslots(filteredLines.map(line => line.id));
    }
  };

  const handleContestSubmit = async () => {
    if (!contestReason.trim()) {
      setContestError('Please provide a reason for contesting this invoice');
      return;
    }

    if (selectedTimeslots.length === 0) {
      setContestError('Please select at least one timeslot to contest, or select all to contest the entire invoice');
      return;
    }

    setContestLoading(true);
    setContestError(null);

    try {
      const timeslotsToContest = selectedTimeslots.length === invoiceLines.length ? null : selectedTimeslots;
      const result = await contestInvoice(contestInvoiceId, contestReason, timeslotsToContest);
      console.log('[PatientInvoices] Contest successful:', result);
      
      // Update the invoice status in the local state
      setInvoices(prev => prev.map(inv => 
        inv.id === contestInvoiceId 
          ? { ...inv, status: 'Contested' }
          : inv
      ));
      
      // Close modal and reset state
      setShowContestModal(false);
      setContestInvoiceId(null);
      setContestReason('');
      setSelectedTimeslots([]);
      setInvoiceLines([]);
      setFilteredLines([]);
      
      // Show success message
      const contestedCount = result.contested_timeslots === 'all' ? 'all' : `${result.contested_timeslots}`;
      alert(`Invoice contested successfully! ${contestedCount} timeslots were contested. A helpdesk ticket has been created for the administrator team.`);
      
    } catch (err) {
      console.error('[PatientInvoices] Contest error:', err);
      setContestError(err.message);
    } finally {
      setContestLoading(false);
    }
  };

  const handleContestCancel = () => {
    setShowContestModal(false);
    setContestInvoiceId(null);
    setContestReason('');
    setContestError(null);
    setSelectedTimeslots([]);
    setInvoiceLines([]);
    setFilteredLines([]);
    setSearchDate('');
  };

  if (error) {
    return (
      <BaseLayout>
        <div className="patient-invoices-container">
          <div className="page-header">
            <h1 className="page-title">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="me-3">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
                <path d="M8 12H16V14H8V12ZM8 16H13V18H8V16Z" fill="currentColor"/>
              </svg>
              My Invoices
            </h1>
            <p className="page-subtitle">View and manage your healthcare invoices</p>
          </div>

          <div className="content-container">
            <div className="error-container">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <h3>Error Loading Invoices</h3>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="patient-invoices-container">
        <div className="page-header">
          <h1 className="page-title">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="me-3">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
              <path d="M8 12H16V14H8V12ZM8 16H13V18H8V16Z" fill="currentColor"/>
            </svg>
            My Invoices
          </h1>
          <p className="page-subtitle">View and manage your healthcare invoices</p>
        </div>

        <div className="content-container">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading invoices...</span>
            </div>
          ) : !Array.isArray(invoices) ? (
            <div className="error-container">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <h3>Error Loading Invoices</h3>
              <p>Invalid invoice data received. Please try refreshing the page.</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="no-invoices-container">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              <h3>No invoices found</h3>
              <p>You don't have any invoices yet. Invoices will appear here after your appointments.</p>
            </div>
          ) : (
            <div className="invoices-table-container">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>#{inv.id}</td>
                      <td>{inv.period_start} - {inv.period_end}</td>
                      <td>
                        <span className={`status-badge status-${inv.status?.toLowerCase()?.replace(' ', '-')}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="amount-cell">€{inv.amount}</td>
                      <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button onClick={() => handleViewDetail(inv.id)} className="view-button">
                          View Details
                        </button>
                        {inv.status !== 'Contested' && inv.status !== 'Cancelled' && (
                          <button 
                            onClick={() => handleContest(inv.id)}
                            className="contest-button"
                          >
                            Contest
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header">
              <h3>Invoice #{selectedInvoice}</h3>
              <button 
                className="close-button"
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </button>
            </div>
            
            {detailLoading ? (
              <div className="modal-body">
                <div className="loading-container">
                  <div className="spinner"></div>
                  <span>Loading invoice details...</span>
                </div>
              </div>
            ) : invoiceDetail ? (
              <div className="modal-body">
                <div className="invoice-summary">
                  <div className="summary-item">
                    <label>Patient:</label>
                    <span>{invoiceDetail.patient_name || 'Unknown Patient'}</span>
                  </div>
                  <div className="summary-item">
                    <label>Period:</label>
                    <span>{invoiceDetail.period_start} - {invoiceDetail.period_end}</span>
                  </div>
                  <div className="summary-item">
                    <label>Status:</label>
                    <span className={`status-badge status-${invoiceDetail.status?.toLowerCase()?.replace(' ', '-')}`}>
                      {invoiceDetail.status}
                    </span>
                  </div>
                  <div className="summary-item">
                    <label>Total Hours:</label>
                    <span>{invoiceDetail.total_hours || 0}h</span>
                  </div>
                  <div className="summary-item">
                    <label>Total Amount:</label>
                    <span className="amount-highlight">€{invoiceDetail.amount}</span>
                  </div>
                  <div className="summary-item">
                    <label>Created:</label>
                    <span>{new Date(invoiceDetail.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Insurance Coverage Summary */}
                {invoiceDetail.insurance_coverage_summary && (
                  <div className="insurance-summary">
                    <h4>🏥 Insurance Coverage Summary</h4>
                    <div className="coverage-stats">
                      <div className="coverage-item">
                        <span className="coverage-label">Total Services:</span>
                        <span className="coverage-value">{invoiceDetail.insurance_coverage_summary.total_lines}</span>
                      </div>
                      <div className="coverage-item">
                        <span className="coverage-label">Covered by Insurance:</span>
                        <span className="coverage-value">{invoiceDetail.insurance_coverage_summary.covered_by_insurance}</span>
                      </div>
                      <div className="coverage-item">
                        <span className="coverage-label">Patient Pays:</span>
                        <span className="coverage-value amount-highlight">€{invoiceDetail.insurance_coverage_summary.patient_amount}</span>
                      </div>
                      <div className="coverage-item">
                        <span className="coverage-label">Coverage:</span>
                        <span className="coverage-value">{invoiceDetail.insurance_coverage_summary.coverage_percentage}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Breakdown */}
                {invoiceDetail.lines_breakdown && (
                  <div className="service-breakdown">
                    <h4>📊 Service Breakdown</h4>
                    <div className="breakdown-grid">
                      {invoiceDetail.lines_breakdown.service_1_2.count > 0 && (
                        <div className="breakdown-card">
                          <div className="breakdown-header">
                            <span className="service-icon">🏠</span>
                            <span className="service-title">Family Help & Housekeeping</span>
                          </div>
                          <div className="breakdown-stats">
                            <div className="stat-item">
                              <span className="stat-label">Sessions:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.service_1_2.count}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Hours:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.service_1_2.total_hours.toFixed(1)}h</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Amount:</span>
                              <span className="stat-value">€{invoiceDetail.lines_breakdown.service_1_2.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="breakdown-note">
                            <small>💡 Patient always pays for these services</small>
                          </div>
                        </div>
                      )}

                      {invoiceDetail.lines_breakdown.service_3.count > 0 && (
                        <div className="breakdown-card">
                          <div className="breakdown-header">
                            <span className="service-icon">🏥</span>
                            <span className="service-title">Nursing Care</span>
                          </div>
                          <div className="breakdown-stats">
                            <div className="stat-item">
                              <span className="stat-label">Sessions:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.service_3.count}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Hours:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.service_3.total_hours.toFixed(1)}h</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Amount:</span>
                              <span className="stat-value">€{invoiceDetail.lines_breakdown.service_3.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="breakdown-note">
                            <small>💡 €0.00 if prescription, INAMI rate if no prescription</small>
                          </div>
                        </div>
                      )}

                      {invoiceDetail.lines_breakdown.other.count > 0 && (
                        <div className="breakdown-card">
                          <div className="breakdown-header">
                            <span className="service-icon">🔧</span>
                            <span className="service-title">Other Services</span>
                          </div>
                          <div className="breakdown-stats">
                            <div className="stat-item">
                              <span className="stat-label">Sessions:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.other.count}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Hours:</span>
                              <span className="stat-value">{invoiceDetail.lines_breakdown.other.total_hours.toFixed(1)}h</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Amount:</span>
                              <span className="stat-value">€{invoiceDetail.lines_breakdown.other.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="invoice-lines-section">
                  <h4>📋 Detailed Invoice Lines</h4>
                  <div className="lines-table-container">
                    <table className="invoice-lines-table enhanced">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Service</th>
                          <th>Provider</th>
                          <th>Duration</th>
                          <th>Rate</th>
                          <th>Coverage</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetail.lines?.map(line => (
                          <tr key={line.id} className={line.covered_by_insurance ? 'covered-line' : 'patient-pays-line'}>
                            <td>{line.date}</td>
                            <td className="time-cell">
                              <div className="time-range">
                                <span className="start-time">{line.start_time}</span>
                                <span className="time-separator">-</span>
                                <span className="end-time">{line.end_time}</span>
                              </div>
                            </td>
                            <td className="service-cell">
                              <div className="service-info">
                                <span className="service-name">{line.service_name}</span>
                                {line.pricing_explanation && (
                                  <div className="pricing-explanation" title={line.pricing_explanation}>
                                    <small>{line.pricing_explanation}</small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{line.provider_name}</td>
                            <td className="duration-cell">
                              <span className="duration-hours">{line.duration_hours || calculateDuration(line.start_time, line.end_time)}h</span>
                            </td>
                            <td className="rate-cell">
                              {line.hourly_rate && line.hourly_rate > 0 ? (
                                <span className="hourly-rate">€{line.hourly_rate}/h</span>
                              ) : (
                                <span className="no-rate">N/A</span>
                              )}
                            </td>
                            <td className="coverage-cell">
                              {line.covered_by_insurance ? (
                                <span className="coverage-badge covered">
                                  <span className="coverage-icon">🏥</span>
                                  <span className="coverage-text">INAMI</span>
                                </span>
                              ) : (
                                <span className="coverage-badge patient">
                                  <span className="coverage-icon">👤</span>
                                  <span className="coverage-text">Patient</span>
                                </span>
                              )}
                            </td>
                            <td className="price-cell">
                              <span className={`price-amount ${line.covered_by_insurance ? 'covered-price' : 'patient-price'}`}>
                                €{line.price}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-${line.status?.toLowerCase()?.replace(' ', '-')}`}>
                                {line.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => setSelectedInvoice(null)}
                    className="close-modal-button"
                  >
                    Close
                  </button>
                  {invoiceDetail.status !== 'Contested' && invoiceDetail.status !== 'Cancelled' && (
                    <button 
                      onClick={() => {
                        setSelectedInvoice(null);
                        handleContest(invoiceDetail.id);
                      }}
                      className="contest-button"
                    >
                      Contest This Invoice
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="error-container">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <h3>Error Loading Invoice Details</h3>
                <p>Unable to load invoice details. Please try again.</p>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="close-modal-button"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Contest Modal */}
      {showContestModal && (
        <div className="modal-overlay contest-modal-overlay">
          <div className="modal-content contest-modal">
            <div className="modal-header">
              <h3>Contest Invoice #{contestInvoiceId}</h3>
              <button 
                className="close-button"
                onClick={handleContestCancel}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {contestError && (
                <div className="error-message" style={{ marginBottom: '15px' }}>
                  {contestError}
                </div>
              )}
              
              {/* Timeslots Section */}
              <div className="timeslots-section">
                <h4>Select Timeslots to Contest:</h4>
                
                {/* Date Search */}
                <div className="search-section">
                  <label htmlFor="date-search">Filter by date:</label>
                  <input
                    id="date-search"
                    type="date"
                    value={searchDate}
                    onChange={(e) => handleDateSearch(e.target.value)}
                    style={{ marginLeft: '8px', padding: '4px' }}
                  />
                  <button
                    onClick={() => handleDateSearch('')}
                    style={{ marginLeft: '8px', padding: '4px 8px' }}
                  >
                    Clear
                  </button>
                </div>
                
                {/* Select All Button */}
                <div style={{ margin: '10px 0' }}>
                  <button onClick={handleSelectAllTimeslots}>
                    {selectedTimeslots.length === filteredLines.length ? 'Deselect All' : 'Select All Visible'}
                  </button>
                  <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>
                    {selectedTimeslots.length} of {filteredLines.length} timeslots selected
                  </span>
                </div>
                
                {/* Timeslots List */}
                <div className="timeslots-list">
                  {linesLoading ? (
                    <div>Loading invoice details...</div>
                  ) : filteredLines.length === 0 ? (
                    <div>No timeslots found for the selected criteria.</div>
                  ) : (
                    <table className="timeslots-table">
                      <colgroup>
                        <col style={{ width: '40px' }} />   {/* Select */}
                        <col style={{ width: '100px' }} />  {/* Date */}
                        <col style={{ width: '120px' }} />  {/* Time */}
                        <col />                             {/* Service */}
                        <col style={{ width: '150px' }} />  {/* Provider */}
                        <col style={{ width: '80px' }} />   {/* Duration */}
                        <col style={{ width: '80px' }} />   {/* Price */}
                        <col style={{ width: '100px' }} />  {/* Status */}
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Select</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Service</th>
                          <th>Provider</th>
                          <th>Duration</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLines.map(line => (
                          <tr key={line.id} className={selectedTimeslots.includes(line.id) ? 'selected-timeslot' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedTimeslots.includes(line.id)}
                                onChange={() => handleTimeslotSelection(line.id)}
                              />
                            </td>
                            <td>{line.date}</td>
                            <td>{line.start_time} - {line.end_time}</td>
                            <td title={line.service_name}>{line.service_name}</td>
                            <td title={line.provider_name}>{line.provider_name}</td>
                            <td>{calculateDuration(line.start_time, line.end_time)}h</td>
                            <td>€{line.price}</td>
                            <td>
                              <span className={`status-badge status-${line.status?.toLowerCase()?.replace(' ', '-')}`}>
                                {line.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              
              {/* Reason Section */}
              <div className="reason-section">
                <label htmlFor="contest-reason">Reason for contesting:</label>
                <textarea
                  id="contest-reason"
                  value={contestReason}
                  onChange={(e) => setContestReason(e.target.value)}
                  placeholder="Explain why you are contesting the selected timeslots..."
                  rows={4}
                  style={{ 
                    width: '100%', 
                    marginTop: '8px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  disabled={contestLoading}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={handleContestCancel}
                  disabled={contestLoading}
                  className="close-modal-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleContestSubmit}
                  disabled={contestLoading || !contestReason.trim() || selectedTimeslots.length === 0}
                  className="contest-submit-button"
                >
                  {contestLoading ? 'Submitting...' : `Contest ${selectedTimeslots.length} Timeslot${selectedTimeslots.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseLayout>
  );
};

export default PatientInvoices; 