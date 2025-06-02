import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduleCalendar.css';
import './PatientSchedule.css';

const PatientSchedule = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(formatDateForInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))); // 30 days ahead
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [isFamilyView, setIsFamilyView] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const navigate = useNavigate();

  // Format date for input field
  function formatDateForInput(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) 
      month = '0' + month;
    if (day.length < 2) 
      day = '0' + day;

    return [year, month, day].join('-');
  }

  // Check if the user is a family member
  useEffect(() => {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData && userData.user && userData.user.role === 'Family Patient') {
        setIsFamilyView(true);
        fetchFamilyMembers();
      }
    }
  }, []);

  // Fetch family members if the user is a family member
  const fetchFamilyMembers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8000/family/linked-patients/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.linked_patients || []);
      } else {
        console.error('Failed to fetch family members');
      }
    } catch (err) {
      console.error('Error fetching family members:', err);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    setAppointmentDetails(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access your schedule');
        setLoading(false);
        return;
      }

      let endpoint = isFamilyView 
        ? `http://localhost:8000/schedule/family/schedule/?start_date=${startDate}&end_date=${endDate}`
        : `http://localhost:8000/schedule/patient/schedule/?start_date=${startDate}&end_date=${endDate}`;
      
      // Add patient_id if a family member is selected
      if (isFamilyView && selectedFamilyMember) {
        endpoint += `&patient_id=${selectedFamilyMember}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch appointments');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch appointment details when an appointment is selected
  const fetchAppointmentDetails = async (appointmentId) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access appointment details');
        setLoading(false);
        return;
      }

      const endpoint = isFamilyView 
        ? `http://localhost:8000/schedule/family/appointment/${appointmentId}/`
        : `http://localhost:8000/schedule/patient/appointment/${appointmentId}/`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointmentDetails(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch appointment details');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching appointment details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    e.preventDefault();
    fetchAppointments();
  };

  // Handle appointment click
  const handleAppointmentClick = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    fetchAppointmentDetails(appointmentId);
  };

  // Handle family member change
  const handleFamilyMemberChange = (e) => {
    setSelectedFamilyMember(e.target.value);
  };

  // Format date and time for display
  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return `${formattedDate} ${timeString}`;
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [startDate, endDate, selectedFamilyMember, isFamilyView]);

  return (
    <div className="patient-schedule-container">
      <h1>{isFamilyView ? 'Family Member Schedule' : 'My Appointments'}</h1>
      
      <div className="schedule-controls">
        <form onSubmit={handleFilterChange} className="filter-form">
          <div className="date-filter">
            <label htmlFor="start-date">From:</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            
            <label htmlFor="end-date">To:</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          {isFamilyView && familyMembers.length > 0 && (
            <div className="family-filter">
              <label htmlFor="family-member">Family Member:</label>
              <select
                id="family-member"
                value={selectedFamilyMember || ''}
                onChange={handleFamilyMemberChange}
              >
                <option value="">All Family Members</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button type="submit">Filter</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="schedule-content">
          <div className="appointments-list">
            {appointments.length > 0 ? (
              appointments.map(appointment => (
                <div
                  key={appointment.id}
                  className={`appointment-item ${selectedAppointmentId === appointment.id ? 'selected' : ''}`}
                  onClick={() => handleAppointmentClick(appointment.id)}
                >
                  <div className="appointment-header">
                    <span className="appointment-date">
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className={`appointment-status ${getStatusClass(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className="appointment-details">
                    <p><strong>Provider:</strong> {appointment.provider_name}</p>
                    <p><strong>Time:</strong> {appointment.start_time} - {appointment.end_time}</p>
                    {isFamilyView && <p><strong>Patient:</strong> {appointment.patient_name}</p>}
                    <p><strong>Type:</strong> {appointment.appointment_type}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-appointments">
                No appointments found for the selected date range
              </div>
            )}
          </div>

          {appointmentDetails && (
            <div className="appointment-detail-view">
              <h2>Appointment Details</h2>
              <div className="appointment-detail-content">
                <p><strong>Date:</strong> {new Date(appointmentDetails.date).toLocaleDateString('en-US')}</p>
                <p><strong>Time:</strong> {appointmentDetails.start_time} - {appointmentDetails.end_time}</p>
                <p><strong>Duration:</strong> {appointmentDetails.duration} minutes</p>
                <p><strong>Provider:</strong> {appointmentDetails.provider_name}</p>
                {isFamilyView && <p><strong>Patient:</strong> {appointmentDetails.patient_name}</p>}
                <p><strong>Location:</strong> {appointmentDetails.location || 'Not specified'}</p>
                <p><strong>Status:</strong> <span className={getStatusClass(appointmentDetails.status)}>{appointmentDetails.status}</span></p>
                <p><strong>Type:</strong> {appointmentDetails.appointment_type}</p>
                {appointmentDetails.notes && (
                  <div className="appointment-notes">
                    <h3>Notes</h3>
                    <p>{appointmentDetails.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSchedule;
