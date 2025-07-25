import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduleCalendar.css';
import './PatientSchedule.css';
import { SpinnerOnly } from '../../components/LoadingComponents';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager';

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
  const [roleChecked, setRoleChecked] = useState(false); // Add this to track if role check is complete
  const navigate = useNavigate();

  // Use translation hooks
  const { schedule, common, placeholders } = useCareTranslation();

  // Use modern authentication API
  const { get } = useAuthenticatedApi();

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
  }  // Check if the user is a family member
  useEffect(() => {
    console.log('=== PatientSchedule useEffect - Role Detection ===');
      const checkUserRole = async () => {
      try {
        if (!tokenManager.isAuthenticated()) {
          console.log('No access token found');
          return;
        }

        console.log('Fetching user profile...');
        // Fetch user profile to get role information
        const userData = await get('http://localhost:8000/account/profile/');
        console.log('User profile data:', userData);
        
        const userRole = userData?.user?.role;
        console.log('Detected user role:', userRole);
          if (userRole === 'Family Patient') {
          console.log('✅ User is Family Patient - enabling family view');
          setIsFamilyView(true);
          fetchFamilyMembers();
        } else {
          console.log('❌ User is not Family Patient - regular patient view');
          console.log('User role is:', userRole);
          setIsFamilyView(false);
        }
        
        // Mark role check as complete
        setRoleChecked(true);      } catch (err) {
        console.error('Error checking user role:', err);
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          tokenManager.handleLogout();
        }
        // Even if profile fetch fails, mark role check as complete to avoid infinite waiting
        setRoleChecked(true);
      }
    };

    checkUserRole();
  }, []);  // Fetch family members if the user is a family member
  const fetchFamilyMembers = async () => {
    try {
      if (!tokenManager.isAuthenticated()) {
        return;
      }

      const data = await get(`http://localhost:8000/account/family-patient/linked-patient/`);
      console.log('Family members data:', data);
      // Handle both linked_patients (array) and linked_patient (single) format
      const linkedPatients = data.linked_patients || (data.linked_patient ? [data.linked_patient] : []);
      setFamilyMembers(linkedPatients);
    } catch (err) {
      console.error('Error fetching family members:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
      }
    }
  };
  // Transform family schedule data from nested to flat structure
  const transformFamilyScheduleData = (data) => {
    console.log('=== transformFamilyScheduleData ===');
    console.log('Input data:', data);
    
    if (!data || !data.patients) {
      console.log('No patients data found');
      return [];
    }
    
    const flatAppointments = [];
    
    data.patients.forEach(patient => {
      console.log('Processing patient:', patient.patient_info);
      const patientName = patient.patient_info.name;
      
      patient.schedules.forEach(schedule => {
        console.log('Processing schedule:', schedule.id, 'with', schedule.appointments.length, 'appointments');
          // Transform each schedule to match frontend expectations
        const transformedSchedule = {
          id: schedule.id,
          date: schedule.date,
          provider: {
            id: schedule.provider.id,
            name: schedule.provider.name, // Keep the full name for display
            // Split the provider name to match frontend expectations
            firstname: schedule.provider.name.split(' ')[0] || '',
            lastname: schedule.provider.name.split(' ').slice(1).join(' ') || '',
            service_type: schedule.provider.service_type
          },
          appointments: schedule.appointments, // Keep appointments as-is
          patient_name: patientName,
          service_type: schedule.provider.service_type
        };
        
        flatAppointments.push(transformedSchedule);
      });
    });
    
    console.log('Transformed appointments:', flatAppointments);
    return flatAppointments;
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    console.log('=== fetchAppointments called ===');
    console.log('isFamilyView:', isFamilyView);
    console.log('selectedFamilyMember:', selectedFamilyMember);
    
    setLoading(true);
    setError('');
    setAppointmentDetails(null);
      try {
      if (!tokenManager.isAuthenticated()) {
        setError('Please log in to access your schedule');
        setLoading(false);
        return;
      }

      let endpoint = isFamilyView 
        ? `http://localhost:8000/schedule/family/schedule/?start_date=${startDate}&end_date=${endDate}`
        : `http://localhost:8000/schedule/patient/schedule/?start_date=${startDate}&end_date=${endDate}`;
      
      console.log('Selected endpoint:', endpoint);
      
      // Add patient_id if a family member is selected
      if (isFamilyView && selectedFamilyMember) {
        endpoint += `&patient_id=${selectedFamilyMember}`;
        console.log('Added patient_id, final endpoint:', endpoint);
      }

      console.log('Making request to:', endpoint);
      const data = await get(endpoint);
      console.log('Raw API response:', data);
      
      if (isFamilyView) {
        // Transform the nested family schedule data to flat structure
        const transformedAppointments = transformFamilyScheduleData(data);
        setAppointments(transformedAppointments);
      } else {
        // Regular patient view expects flat structure already
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
        setError('Please log in to access your schedule');
      } else {
        setError('Network error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  // Fetch appointment details when an appointment is selected
  const fetchAppointmentDetails = async (appointmentId) => {
    setLoading(true);
    
    try {
      if (!tokenManager.isAuthenticated()) {
        setError('Please log in to access appointment details');
        setLoading(false);
        return;
      }

      const endpoint = isFamilyView 
        ? `http://localhost:8000/schedule/family/appointment/${appointmentId}/`
        : `http://localhost:8000/schedule/patient/appointment/${appointmentId}/`;

      const data = await get(endpoint);
      setAppointmentDetails(data);
    } catch (err) {
      console.error('Error fetching appointment details:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        tokenManager.handleLogout();
        setError('Please log in to access appointment details');
      } else {
        setError('Network error occurred');
      }
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
    // Find the appointment data we already have instead of making another API call
    const selectedAppointment = appointments.find(app => app.id === appointmentId);
    setAppointmentDetails(selectedAppointment);
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
  };  // Get status class for styling
  const getStatusClass = (status) => {
    if (!status) return 'status-scheduled'; // Default fallback
    
    // Normalize status (handle potential variations)
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    
    // Valid status classes that match our CSS
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    
    if (validStatuses.includes(normalizedStatus)) {
      return `status-${normalizedStatus}`;
    }
    
    // Legacy status mappings for backward compatibility
    if (normalizedStatus === 'pending') {
      return 'status-scheduled';
    }
    
    return 'status-scheduled'; // Default fallback
  };

  // Helper function to translate status values
  const getTranslatedStatus = (status) => {
    if (!status) return schedule('statusOptions.scheduled');
    
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
    
    // Map database status values to translation keys
    const statusMap = {
      'scheduled': 'statusOptions.scheduled',
      'confirmed': 'statusOptions.confirmed',
      'inprogress': 'statusOptions.inProgress',
      'in_progress': 'statusOptions.inProgress',
      'completed': 'statusOptions.completed',
      'cancelled': 'statusOptions.cancelled',
      'canceled': 'statusOptions.cancelled', // Handle both spellings
      'noshow': 'statusOptions.noShow',
      'no_show': 'statusOptions.noShow',
      'pending': 'statusOptions.scheduled' // Legacy fallback
    };
    
    const translationKey = statusMap[normalizedStatus];
    return translationKey ? schedule(translationKey) : status; // Fallback to original if no translation found
  };
  useEffect(() => {
    console.log('=== useEffect for fetchAppointments ===');
    console.log('roleChecked:', roleChecked);
    console.log('isFamilyView:', isFamilyView);
    
    // Only fetch appointments after role check is complete
    if (roleChecked) {
      console.log('✅ Role check complete, fetching appointments');
      fetchAppointments();
    } else {
      console.log('⏳ Waiting for role check to complete...');
    }
  }, [startDate, endDate, selectedFamilyMember, isFamilyView, roleChecked]);
  return (
    <div className="patient-schedule-container">
      <h1>{isFamilyView ? schedule('familySchedule') : schedule('myAppointments')}</h1>
      
      <div className="schedule-controls">
        <form onSubmit={handleFilterChange} className="filter-form">
          <div className="date-filter">
            <label htmlFor="start-date">{common('from')}:</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
              <label htmlFor="end-date">{common('to')}:</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          {isFamilyView && familyMembers.length > 0 && (
            <div className="family-filter">
              <label htmlFor="family-member">{schedule('familyMember')}:</label>
              <select
                id="family-member"
                value={selectedFamilyMember || ''}
                onChange={handleFamilyMemberChange}
              >
                <option value="">{schedule('allFamilyMembers')}</option>                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.firstname} {member.lastname}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button type="submit">{common('filter')}</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}
        {loading ? (
        <div className="loading-center">
          <SpinnerOnly size="large" />
        </div>
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
                    </span>                    <span className={`appointment-status ${getStatusClass(appointment.appointments?.[0]?.status || 'scheduled')}`}>
                      {getTranslatedStatus(appointment.appointments?.[0]?.status || 'scheduled')}
                    </span>
                  </div>                  <div className="appointment-details">
                    <p><strong>{schedule('provider')}:</strong> {appointment.provider?.name || 'Provider TBD'}</p>
                    {appointment.appointments && appointment.appointments.length > 0 && (
                      <p><strong>{schedule('time')}:</strong> {appointment.appointments[0].start_time} - {appointment.appointments[0].end_time}</p>
                    )}
                    {isFamilyView && <p><strong>{schedule('patient')}:</strong> {appointment.patient_name}</p>}
                    {appointment.appointments && appointment.appointments.length > 0 && appointment.appointments[0].service && (
                      <p><strong>{schedule('service')}:</strong> {appointment.appointments[0].service.name}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-appointments">
                {schedule('noAppointments')}
              </div>
            )}
          </div>          {appointmentDetails && (
            <div className="appointment-detail-view">
              <div className="appointment-detail-header">
                <h2>{schedule('appointmentDetails')}</h2>
                <button 
                  className="close-button"
                  onClick={() => setAppointmentDetails(null)}
                  title={common('close')}
                >
                  ×
                </button>
              </div>
              <div className="appointment-detail-content">
                <p><strong>{schedule('date')}:</strong> {new Date(appointmentDetails.date).toLocaleDateString('en-US')}</p>
                {appointmentDetails.appointments && appointmentDetails.appointments.length > 0 && (
                  <>
                    <p><strong>{schedule('time')}:</strong> {appointmentDetails.appointments[0].start_time} - {appointmentDetails.appointments[0].end_time}</p>
                    {appointmentDetails.appointments[0].service && (
                      <p><strong>{schedule('service')}:</strong> {appointmentDetails.appointments[0].service.name}</p>
                    )}
                    {appointmentDetails.appointments[0].description && (
                      <p><strong>{common('description')}:</strong> {appointmentDetails.appointments[0].description}</p>
                    )}
                    <p><strong>{common('status')}:</strong> <span className={getStatusClass(appointmentDetails.appointments[0].status || 'scheduled')}>{getTranslatedStatus(appointmentDetails.appointments[0].status || 'scheduled')}</span></p>
                  </>
                )}
                <p><strong>{schedule('provider')}:</strong> {appointmentDetails.provider?.name || 'Provider TBD'}</p>
                {appointmentDetails.provider?.service_type && (
                  <p><strong>{schedule('providerService')}:</strong> {appointmentDetails.provider.service_type}</p>
                )}
                {isFamilyView && appointmentDetails.patient_name && (
                  <p><strong>{schedule('patient')}:</strong> {appointmentDetails.patient_name}</p>
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
