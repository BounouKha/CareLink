import React, { useState, useEffect } from 'react';
import tokenManager from '../utils/tokenManager';
import './PricingManagement.css';

const PricingManagement = () => {
  const [pricingRecords, setPricingRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    patient: '',
    service: '',
    hourly_rate: '',
    notes: ''
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('');
  const [sortBy, setSortBy] = useState('patient_name');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for search
    const timeoutId = setTimeout(() => {
      setIsSearching(false);
    }, 500); // 500ms delay
    
    setSearchTimeout(timeoutId);
    setIsSearching(true);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [searchTerm, filterService]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pricing records, patients, and services in parallel
      const [pricingRes, patientsRes, servicesRes] = await Promise.all([
        tokenManager.authenticatedFetch('http://localhost:8000/account/patient-service-prices/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        tokenManager.authenticatedFetch('http://localhost:8000/account/pricing/patients/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        tokenManager.authenticatedFetch('http://localhost:8000/account/pricing/services/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (pricingRes.ok && patientsRes.ok && servicesRes.ok) {
        const [pricingData, patientsData, servicesData] = await Promise.all([
          pricingRes.json(),
          patientsRes.json(),
          servicesRes.json()
        ]);

        setPricingRecords(pricingData);
        setPatients(patientsData);
        setServices(servicesData);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to load pricing data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const url = editingRecord 
        ? `http://localhost:8000/account/patient-service-prices/${editingRecord.id}/`
        : 'http://localhost:8000/account/patient-service-prices/';

      const response = await tokenManager.authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient: parseInt(formData.patient),
          service: parseInt(formData.service),
          hourly_rate: parseFloat(formData.hourly_rate),
          notes: formData.notes || null
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingRecord(null);
        setFormData({ patient: '', service: '', hourly_rate: '', notes: '' });
        fetchData(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save pricing record');
      }
    } catch (err) {
      setError('Failed to save pricing record: ' + err.message);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      patient: record.patient.toString(),
      service: record.service.toString(),
      hourly_rate: record.hourly_rate.toString(),
      notes: record.notes || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this pricing record?')) {
      return;
    }

    try {
      const response = await tokenManager.authenticatedFetch(`http://localhost:8000/account/patient-service-prices/${recordId}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        fetchData(); // Refresh the list
      } else {
        throw new Error('Failed to delete pricing record');
      }
    } catch (err) {
      setError('Failed to delete pricing record: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ patient: '', service: '', hourly_rate: '', notes: '' });
    setEditingRecord(null);
    setShowCreateModal(false);
  };

  // Filter and sort pricing records
  const filteredRecords = pricingRecords
    .filter(record => {
      const matchesSearch = searchTerm === '' || 
        record.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.service_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesService = filterService === '' || record.service.toString() === filterService;
      
      return matchesSearch && matchesService;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'patient_name':
          return (a.patient_name || '').localeCompare(b.patient_name || '');
        case 'service_name':
          return (a.service_name || '').localeCompare(b.service_name || '');
        case 'hourly_rate':
          return parseFloat(a.hourly_rate) - parseFloat(b.hourly_rate);
        case 'created_at':
          return new Date(b.created_at) - new Date(a.created_at);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="pricing-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading pricing data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-management">
      <div className="pricing-header">
        <div className="header-info">
          <h2>💰 Patient Service Pricing</h2>
          <p className="header-description">
            Manage custom hourly rates for specific patients and services. 
            These rates override default service pricing when generating invoices.
          </p>
        </div>
        <button 
          className="create-pricing-btn"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Add Custom Pricing
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-group">
          <label htmlFor="search">🔍 Search:</label>
          <div className="search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Search by patient or service name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                  }
              }}
            />
            {isSearching && <div className="search-spinner"></div>}
          </div>
        </div>
        
        <div className="filter-group">
          <label htmlFor="service-filter">🏥 Service:</label>
          <select
            id="service-filter"
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
          >
            <option value="">All Services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="sort-group">
          <label htmlFor="sort-by">📊 Sort by:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="patient_name">Patient Name</option>
            <option value="service_name">Service Name</option>
            <option value="hourly_rate">Hourly Rate</option>
            <option value="created_at">Date Created</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="pricing-stats">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <span className="stat-value">{filteredRecords.length}</span>
            <span className="stat-label">Custom Pricing Records</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-info">
            <span className="stat-value">{new Set(filteredRecords.map(r => r.patient)).size}</span>
            <span className="stat-label">Patients with Custom Rates</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏥</span>
          <div className="stat-info">
            <span className="stat-value">{new Set(filteredRecords.map(r => r.service)).size}</span>
            <span className="stat-label">Services with Custom Rates</span>
          </div>
        </div>
      </div>

      {/* Pricing Records Table */}
      <div className="pricing-table-container">
        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <span className="no-records-icon">📝</span>
            <h3>No pricing records found</h3>
            <p>
              {searchTerm || filterService 
                ? 'Try adjusting your search or filter criteria.'
                : 'Start by creating custom pricing for specific patients and services.'
              }
            </p>
          </div>
        ) : (
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Service</th>
                <th>Custom Rate</th>
                <th>Default Rate</th>
                <th>Savings</th>
                <th>Notes</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const defaultService = services.find(s => s.id === record.service);
                const defaultRate = defaultService?.default_price || 0;
                const customRate = parseFloat(record.hourly_rate);
                const savings = defaultRate - customRate;
                const savingsPercentage = defaultRate > 0 ? ((savings / defaultRate) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={record.id}>
                    <td className="patient-cell">
                      <div className="patient-info">
                        <span className="patient-name">{record.patient_name}</span>
                        <small className="patient-id">ID: {record.patient}</small>
                      </div>
                    </td>
                    <td className="service-cell">
                      <div className="service-info">
                        <span className="service-name">{record.service_name}</span>
                        <small className="service-id">ID: {record.service}</small>
                      </div>
                    </td>
                    <td className="rate-cell custom">
                      <span className="rate-amount">€{record.hourly_rate}/h</span>
                    </td>
                    <td className="rate-cell default">
                      <span className="rate-amount">€{defaultRate}/h</span>
                    </td>
                    <td className="savings-cell">
                      {savings !== 0 && (
                        <div className={`savings ${savings > 0 ? 'positive' : 'negative'}`}>
                          <span className="savings-amount">
                            {savings > 0 ? '-' : '+'}€{Math.abs(savings).toFixed(2)}
                          </span>
                          <small className="savings-percentage">
                            ({savings > 0 ? '-' : '+'}{Math.abs(savingsPercentage)}%)
                          </small>
                        </div>
                      )}
                    </td>
                    <td className="notes-cell">
                      {record.notes ? (
                        <span className="notes-text" title={record.notes}>
                          {record.notes.length > 30 ? `${record.notes.substring(0, 30)}...` : record.notes}
                        </span>
                      ) : (
                        <span className="no-notes">—</span>
                      )}
                    </td>
                    <td className="date-cell">
                      <span className="date-text">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEdit(record)}
                        title="Edit pricing"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(record.id)}
                        title="Delete pricing"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingRecord ? '✏️ Edit Custom Pricing' : '➕ Add Custom Pricing'}
              </h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="pricing-form">
              <div className="form-group">
                <label htmlFor="patient">👤 Patient:</label>
                <select
                  id="patient"
                  value={formData.patient}
                  onChange={(e) => setFormData({...formData, patient: e.target.value})}
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} (ID: {patient.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="service">🏥 Service:</label>
                <select
                  id="service"
                  value={formData.service}
                  onChange={(e) => setFormData({...formData, service: e.target.value})}
                  required
                >
                  <option value="">Select a service...</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} (Default: €{service.default_price}/h)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="hourly_rate">💰 Custom Hourly Rate (€):</label>
                <input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  placeholder="e.g., 15.50"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">📝 Notes (optional):</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Reason for custom pricing, special circumstances, etc."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingRecord ? 'Update Pricing' : 'Create Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManagement; 