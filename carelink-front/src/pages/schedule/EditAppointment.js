import React, { useState, useEffect } from 'react';
import './EditAppointment.css';

const EditAppointment = ({ 
  isOpen, 
  appointment, 
  onClose, 
  onAppointmentUpdated, 
  onAppointmentDeleted, 
  providers = [] 
}) => {
  const [formData, setFormData] = useState({
    provider_id: '',
    patient_id: '',
    date: '',
    start_time: '',
    end_time: '',
    service_id: '',
    description: '',
    status: 'scheduled'
  });
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  useEffect(() => {
    if (isOpen && appointment) {
      // Populate form with appointment data
      const timeslot = appointment.timeslots[0]; // Get first timeslot
      
      // Format time strings to remove seconds if present (HH:MM:SS -> HH:MM)
      const formatTimeForInput = (timeStr) => {
        if (!timeStr) return '';
        return timeStr.split(':').slice(0, 2).join(':');
      };
      
      setFormData({
        provider_id: appointment.provider.id || '',
        patient_id: appointment.patient.id || '',
        date: appointment.date || '',
        start_time: formatTimeForInput(timeslot?.start_time) || '',
        end_time: formatTimeForInput(timeslot?.end_time) || '',
        service_id: timeslot?.service?.id || '',
        description: timeslot?.description || '',
        status: timeslot?.status || 'scheduled'
      });
      
      fetchPatients();
      fetchServices();
    }
  }, [isOpen, appointment]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/account/views_patient/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data.results || []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/account/services/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data || []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Ensure time format is HH:MM (remove seconds if present)
      const formatTimeForSubmit = (timeStr) => {
        if (!timeStr) return timeStr;
        return timeStr.split(':').slice(0, 2).join(':');
      };
      
      const submitData = {
        ...formData,
        start_time: formatTimeForSubmit(formData.start_time),
        end_time: formatTimeForSubmit(formData.end_time)
      };
      
      const response = await fetch(`http://localhost:8000/schedule/appointment/${appointment.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const data = await response.json();
        onAppointmentUpdated(data);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update appointment');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating appointment:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Get the first timeslot ID to pass to the backend
      const timeslot = appointment.timeslots[0];
      const timeslotId = timeslot?.id;
      
      // Build the URL with timeslot_id as query parameter if available
      let deleteUrl = `http://localhost:8000/schedule/appointment/${appointment.id}/`;
      if (timeslotId) {
        deleteUrl += `?timeslot_id=${timeslotId}`;
      }
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        onAppointmentDeleted();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete appointment');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting appointment:', err);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-appointment-overlay">
      <div className="edit-appointment-modal">
        <div className="modal-header">
          <h2>Edit Appointment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="edit-appointment-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <div className="form-group">
                <label>Provider *</label>
                <select
                  name="provider_id"
                  value={formData.provider_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Provider</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.service}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Patient *</label>
                <select
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstname} {patient.lastname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Service</label>
                <select
                  name="service_id"
                  value={formData.service_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - €{service.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Add any notes or special instructions..."
              />
            </div>

            <div className="form-actions">
              <div className="primary-actions">
                <button type="button" onClick={onClose} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="update-btn">
                  {loading ? 'Updating...' : 'Update Appointment'}
                </button>
              </div>
              
              <div className="danger-actions">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="delete-btn"
                  disabled={loading}
                >
                  Delete Appointment
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete this appointment? This action cannot be undone.</p>
              <div className="confirm-actions">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete} 
                  className="confirm-delete-btn"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditAppointment;
