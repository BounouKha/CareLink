import React, { useState, useEffect } from 'react';
import './ScheduleCalendar.css';
import QuickSchedule from './QuickSchedule';
import EditAppointment from './EditAppointment';
import RecurringSchedule from './features/RecurringSchedule';

const ScheduleCalendar = () => {
  const [calendarData, setCalendarData] = useState([]);  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // Add status filter
  const [viewType, setViewType] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});  const [showQuickSchedule, setShowQuickSchedule] = useState(false);  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showEditAppointment, setShowEditAppointment] = useState(false);  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRecurringSchedule, setShowRecurringSchedule] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  // Add scroll position preservation
  const [scrollPosition, setScrollPosition] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Function to preserve scroll position
  const preserveScrollPosition = () => {
    const scrollContainer = document.querySelector('.schedule-calendar');
    if (scrollContainer) {
      setScrollPosition(scrollContainer.scrollTop);
    }
  };
    // Function to restore scroll position
  const restoreScrollPosition = () => {
    const scrollContainer = document.querySelector('.schedule-calendar');
    if (scrollContainer && scrollPosition > 0) {
      // Use multiple attempts to ensure scroll position is restored
      setTimeout(() => {
        scrollContainer.scrollTop = scrollPosition;
        // Double-check after a longer delay
        setTimeout(() => {
          if (scrollContainer.scrollTop !== scrollPosition) {
            scrollContainer.scrollTop = scrollPosition;
          }
        }, 100);
      }, 100); // Increased delay for better DOM stability
    }
  };
    useEffect(() => {
    fetchCalendarData();
  }, [currentDate, viewType, selectedProvider, selectedStatus]);

  // Debug effect to track calendar data changes
  useEffect(() => {
    console.log('Calendar data updated:', {
      appointmentCount: calendarData.length,
      totalTimeslots: calendarData.reduce((total, appt) => total + (appt.timeslots?.length || 0), 0),
      viewType,
      selectedProvider,
      selectedStatus
    });
  }, [calendarData, viewType, selectedProvider, selectedStatus]);  const fetchCalendarData = async (preserveScroll = false) => {
    // Prevent multiple simultaneous refreshes
    if (refreshing) {
      console.log('Skipping fetch - already refreshing');
      return;
    }
    
    setRefreshing(true);
    
    // Preserve scroll position if requested
    if (preserveScroll) {
      preserveScrollPosition();
      console.log('Preserving scroll position:', scrollPosition);
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access the schedule');
        return;
      }

      // Calculate date range based on view type
      const { startDate, endDate } = getDateRange(currentDate, viewType);
      
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        view: viewType
      });      if (selectedProvider) {
        queryParams.append('provider_id', selectedProvider);
      }

      if (selectedStatus) {
        queryParams.append('status', selectedStatus);
      }

      const response = await fetch(`http://localhost:8000/schedule/calendar/?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });      if (response.ok) {
        const data = await response.json();
        console.log('Calendar data received:', data.calendar_data?.length || 0, 'appointments');
        setCalendarData(data.calendar_data || []);
        setProviders(data.providers || []);
        setStats(data.stats || {});
        
        // Restore scroll position if it was preserved
        if (preserveScroll) {
          console.log('Restoring scroll position:', scrollPosition);
          restoreScrollPosition();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch calendar data');
        console.error('Failed to fetch calendar data:', errorData);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDateRange = (date, view) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);    let startDate, endDate;

    switch (view) {
      case 'day':
        startDate = formatDateToString(date);
        endDate = formatDateToString(date);
        break;
      case 'week':
        startDate = formatDateToString(startOfWeek);
        endDate = formatDateToString(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        startDate = formatDateToString(startOfMonth);
        endDate = formatDateToString(endOfMonth);
        break;
      default:
        startDate = formatDateToString(startOfWeek);
        endDate = formatDateToString(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000));
    }

    return { startDate, endDate };
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      default:
        newDate.setDate(newDate.getDate() + (direction * 7));
    }
    
    setCurrentDate(newDate);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };  const formatTime = (timeString) => {
    // Return time in 24-hour format
    return timeString;
  };

  // Helper function to format date without timezone conversion
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getViewTitle = () => {
    const { startDate, endDate } = getDateRange(currentDate, viewType);
    const start = new Date(startDate);
    const end = new Date(endDate);

    switch (viewType) {
      case 'day':
        return start.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return start.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        });
      default:
        return '';
    }  };

  const generateRecapData = () => {
    const recap = {
      byDay: {},
      byProvider: {},
      byPatient: {},
      totals: {
        totalAppointments: 0,
        totalTimeslots: 0,
        totalProviders: 0,
        totalPatients: 0
      }
    };

    const providersSet = new Set();
    const patientsSet = new Set();

    calendarData.forEach(appointment => {
      const date = appointment.date;
      const providerName = appointment.provider.name;
      const patientName = appointment.patient.name;
      
      providersSet.add(providerName);
      patientsSet.add(patientName);

      // Group by day
      if (!recap.byDay[date]) {
        recap.byDay[date] = {
          appointments: [],
          timeslotCount: 0
        };
      }
      recap.byDay[date].appointments.push(appointment);
      recap.byDay[date].timeslotCount += appointment.timeslots.length;

      // Group by provider
      if (!recap.byProvider[providerName]) {
        recap.byProvider[providerName] = {
          appointments: [],
          timeslotCount: 0,
          patients: new Set()
        };
      }
      recap.byProvider[providerName].appointments.push(appointment);
      recap.byProvider[providerName].timeslotCount += appointment.timeslots.length;
      recap.byProvider[providerName].patients.add(patientName);

      // Group by patient
      if (!recap.byPatient[patientName]) {
        recap.byPatient[patientName] = {
          appointments: [],
          timeslotCount: 0,
          providers: new Set()
        };
      }
      recap.byPatient[patientName].appointments.push(appointment);
      recap.byPatient[patientName].timeslotCount += appointment.timeslots.length;
      recap.byPatient[patientName].providers.add(providerName);

      // Update totals
      recap.totals.totalTimeslots += appointment.timeslots.length;
    });

    recap.totals.totalAppointments = calendarData.length;
    recap.totals.totalProviders = providersSet.size;
    recap.totals.totalPatients = patientsSet.size;

    // Convert Sets to Arrays for easier rendering
    Object.keys(recap.byProvider).forEach(provider => {
      recap.byProvider[provider].patients = Array.from(recap.byProvider[provider].patients);
    });
    Object.keys(recap.byPatient).forEach(patient => {
      recap.byPatient[patient].providers = Array.from(recap.byPatient[patient].providers);
    });

    return recap;
  };  const handleTimeSlotClick = (date, time) => {
    if (!isDragging) {
      setSelectedTimeSlot({ date, time });
      setShowQuickSchedule(true);
    }
  };
  const handleAppointmentEdit = (appointment, timeslot = null) => {
    if (!isDragging) {
      setSelectedAppointment(appointment);
      // Store the selected timeslot for context if provided
      if (timeslot) {
        // Add timeslot context to the appointment for editing
        appointment.selectedTimeslot = timeslot;
      }
      setShowEditAppointment(true);
    }
  };

  const handleDayClick = (date) => {
    setCurrentDate(new Date(date));
    setViewType('day');
  };

  // Drag and Drop handlers
  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragEnd = (e) => {
    setDraggedAppointment(null);
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = async (e, targetDate, targetTime) => {
    e.preventDefault();
    
    if (!draggedAppointment) return;

    console.log('Dropping appointment:', draggedAppointment.id, 'to', targetDate, targetTime);

    // Calculate new end time (assuming same duration)
    const originalTimeslot = draggedAppointment.timeslots[0];
    if (!originalTimeslot) return;

    const startTime = new Date(`2000-01-01T${originalTimeslot.start_time}`);
    const endTime = new Date(`2000-01-01T${originalTimeslot.end_time}`);
    const duration = endTime - startTime;

    const newStartTime = new Date(`2000-01-01T${targetTime}:00`);
    const newEndTime = new Date(newStartTime.getTime() + duration);

    const newStartTimeStr = newStartTime.toTimeString().substring(0, 5);
    const newEndTimeStr = newEndTime.toTimeString().substring(0, 5);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8000/schedule/appointment/${draggedAppointment.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: targetDate,
          start_time: newStartTimeStr,
          end_time: newEndTimeStr,
        }),
      });      if (response.ok) {
        console.log('Appointment moved successfully, refreshing calendar...');
        // Temporarily disable scroll preservation for drag operations to debug
        fetchCalendarData(false); // Changed from true to false
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to move appointment');
        console.error('Failed to move appointment:', errorData);
      }
    } catch (err) {
      setError('Network error occurred while moving appointment');
      console.error('Error moving appointment:', err);
    }

    setDraggedAppointment(null);
    setIsDragging(false);
  };  const generateTimeSlots = () => {
    const slots = [];
    // Generate 1-hour time slots from 6am to 11pm (23h) to include appointments ending at 23:00
    for (let hour = 6; hour <= 23; hour += 1) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(time);
    }
    return slots;
  };
  const getAppointmentForTimeSlot = (date, time) => {
    return calendarData.find(schedule => {
      return schedule.date === date && schedule.timeslots.some(slot => 
        slot.start_time <= time && slot.end_time > time
      );
    });
  };
  // Get ALL appointments for a time slot (for All Providers view)
  const getAppointmentsForTimeSlot = (date, time) => {
    return calendarData.filter(schedule => {
      return schedule.date === date && schedule.timeslots.some(slot => 
        slot.start_time <= time && slot.end_time > time
      );
    });
  };

  // Get all individual timeslots for a time slot (for individual timeslot clicking)
  const getTimeslotsForTimeSlot = (date, time) => {
    const timeslots = [];
    calendarData.forEach(schedule => {
      schedule.timeslots.forEach(slot => {
        if (schedule.date === date && slot.start_time <= time && slot.end_time > time) {
          timeslots.push({
            ...slot,
            schedule: schedule,
            appointmentId: schedule.id
          });
        }
      });
    });
    return timeslots;
  };
  // Week View Component
  const WeekView = ({ calendarData, currentDate, onTimeSlotClick, onAppointmentEdit, onDragStart, onDragEnd, onDragOver, onDrop, isDragging }) => {
    const timeSlots = generateTimeSlots();
    const weekDays = [];
    
    // Generate week days
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="week-view">
        <div className="week-header">
          <div className="time-column-header">Time</div>
          {weekDays.map(date => (
            <div key={date.toISOString()} className="day-header">
              <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="day-number">{date.getDate()}</div>
            </div>
          ))}
        </div>        <div className="week-grid">
          {timeSlots.map(time => (
            <div key={time} className="time-row">              <div className="time-label">{formatTime(time + ':00')}</div>
              {weekDays.map(date => {
                const dateStr = formatDateToString(date);
                
                // Get all timeslots for this time slot (individual timeslots, not grouped by appointment)
                const timeslots = getTimeslotsForTimeSlot(dateStr, time);
                  return (
                  <div 
                    key={`${dateStr}-${time}`} 
                    className={`time-slot ${timeslots.length > 0 ? 'occupied' : 'available'} ${isDragging && timeslots.length === 0 ? 'drop-zone' : ''} ${timeslots.length > 1 ? 'multiple-timeslots' : ''} ${timeslots.length > 0 ? getPrimaryTimeSlotStatus(timeslots) : ''}`}
                    onClick={() => timeslots.length === 0 ? onTimeSlotClick(dateStr, time) : null}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, dateStr, time)}
                  >
                    {timeslots.length > 0 && (
                      <div className={`timeslots-container ${timeslots.length > 1 ? 'multiple' : ''}`}>
                        {timeslots.map((timeslot, index) => (
                          <div 
                            key={`${timeslot.appointmentId}-${timeslot.id}-${index}`}
                            className={`timeslot-item ${timeslots.length > 1 ? 'compact' : ''} ${getStatusClass(timeslot.status)}`}
                            draggable="true"
                            onDragStart={(e) => onDragStart(e, timeslot.schedule)}
                            onDragEnd={onDragEnd}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              // Pass both the appointment and the specific timeslot
                              onAppointmentEdit(timeslot.schedule, timeslot); 
                            }}
                            style={{
                              width: timeslots.length > 1 ? `${100/timeslots.length}%` : '100%',
                              display: 'inline-block',
                              verticalAlign: 'top'
                            }}
                            title={`${timeslot.schedule.patient.name} - ${timeslot.schedule.provider.name}\nService: ${timeslot.service?.name || 'No Service'}\nTime: ${timeslot.start_time} - ${timeslot.end_time}`}
                          >
                            <div className="timeslot-patient">{timeslot.schedule.patient.name}</div>
                            <div className="timeslot-provider">{timeslot.schedule.provider.name}</div>
                            {timeslot.service?.name && (
                              <div className="timeslot-service">{timeslot.service.name}</div>
                            )}
                            {timeslots.length === 1 && <div className="drag-handle">⋮⋮</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };  // Day View Component
  const DayView = ({ calendarData, currentDate, onTimeSlotClick, onAppointmentEdit, onDragStart, onDragEnd, onDragOver, onDrop, isDragging }) => {
    const timeSlots = generateTimeSlots();
    const dateStr = formatDateToString(currentDate);

    return (
      <div className="day-view">
        <div className="day-header">
          <h2>{currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</h2>
        </div>
        <div className="day-grid">
          {timeSlots.map(time => {
            // Get all individual timeslots for this time slot (like WeekView)
            const timeslots = getTimeslotsForTimeSlot(dateStr, time);
            
            return (              <div 
                key={time} 
                className={`time-slot ${timeslots.length > 0 ? 'occupied' : 'available'} ${isDragging && timeslots.length === 0 ? 'drop-zone' : ''} ${timeslots.length > 1 ? 'multiple-timeslots' : ''} ${timeslots.length > 0 ? getPrimaryTimeSlotStatus(timeslots) : ''}`}
                onClick={() => timeslots.length === 0 ? onTimeSlotClick(dateStr, time) : null}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, dateStr, time)}
              >
                <div className="time-label">{formatTime(time + ':00')}</div>
                <div className="slot-content">
                  {timeslots.length > 0 ? (
                    <div className={`timeslots-container ${timeslots.length > 1 ? 'multiple' : ''}`}>
                      {timeslots.map((timeslot, index) => (
                        <div 
                          key={`${timeslot.appointmentId}-${timeslot.id}-${index}`}
                          className={`timeslot-item ${timeslots.length > 1 ? 'compact' : ''} ${getStatusClass(timeslot.status)}`}
                          draggable="true"
                          onDragStart={(e) => onDragStart(e, timeslot.schedule)}
                          onDragEnd={onDragEnd}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            // Pass both the appointment and the specific timeslot
                            onAppointmentEdit(timeslot.schedule, timeslot); 
                          }}
                          style={{
                            width: timeslots.length > 1 ? `${100/timeslots.length}%` : '100%',
                            display: 'inline-block',
                            verticalAlign: 'top'
                          }}
                          title={`${timeslot.schedule.patient.name} - ${timeslot.schedule.provider.name}\nService: ${timeslot.service?.name || 'No Service'}\nTime: ${timeslot.start_time} - ${timeslot.end_time}`}
                        >
                          <div className="timeslot-patient">{timeslot.schedule.patient.name}</div>
                          <div className="timeslot-provider">{timeslot.schedule.provider.name}</div>
                          {timeslot.service?.name && (
                            <div className="timeslot-service">{timeslot.service.name}</div>
                          )}
                          {timeslots.length === 1 && <div className="drag-handle">⋮⋮</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="slot-placeholder">Click to schedule</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Month View Component
  const MonthView = ({ calendarData, currentDate, onDayClick }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }    const getAppointmentsForDay = (date) => {
      const dateStr = formatDateToString(date);
      return calendarData.filter(schedule => schedule.date === dateStr);
    };

    return (
      <div className="month-view">
        <div className="month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>
        
        <div className="month-grid">
          {days.map(date => {
            const appointments = getAppointmentsForDay(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={date.toISOString()} 
                className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => onDayClick(date)}
              >
                <div className="day-number">{date.getDate()}</div>
                <div className="appointments-count">
                  {appointments.length > 0 && (
                    <span className="count-badge">{appointments.length}</span>
                  )}
                </div>
                <div className="appointments-preview">                  {appointments.slice(0, 2).map((appointment, index) => (
                    <div key={index} className={`appointment-dot ${getStatusClass(appointment.status)}`} title={`${appointment.patient.name} - ${appointment.status || 'scheduled'}`}>
                      {appointment.patient.name.charAt(0)}
                    </div>
                  ))}
                  {appointments.length > 2 && (
                    <div className="more-appointments">+{appointments.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>      </div>
    );
  };

  // Recap Modal Component
  const RecapModal = ({ isOpen, onClose, recapData }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!isOpen) return null;

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="recap-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📊 Schedule Summary</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="recap-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byDay' ? 'active' : ''}`}
              onClick={() => setActiveTab('byDay')}
            >
              By Day
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byProvider' ? 'active' : ''}`}
              onClick={() => setActiveTab('byProvider')}
            >
              By Provider
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byPatient' ? 'active' : ''}`}
              onClick={() => setActiveTab('byPatient')}
            >
              By Patient
            </button>
          </div>

          <div className="recap-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="stats-grid">
                  <div className="stat-item">
                    <h3>{recapData.totals.totalAppointments}</h3>
                    <p>Total Appointments</p>
                  </div>
                  <div className="stat-item">
                    <h3>{recapData.totals.totalTimeslots}</h3>
                    <p>Total Timeslots</p>
                  </div>
                  <div className="stat-item">
                    <h3>{recapData.totals.totalProviders}</h3>
                    <p>Providers</p>
                  </div>
                  <div className="stat-item">
                    <h3>{recapData.totals.totalPatients}</h3>
                    <p>Patients</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'byDay' && (
              <div className="by-day-tab">
                {Object.entries(recapData.byDay).map(([date, dayData]) => (
                  <div key={date} className="day-summary">
                    <h3>{formatDate(date)}</h3>
                    <p>{dayData.appointments.length} appointments, {dayData.timeslotCount} timeslots</p>                    <div className="appointments-list">
                      {dayData.appointments.map((appointment, index) => (
                        <div key={index} className="appointment-summary">
                          <span className="patient-name">{appointment.patient.name}</span>
                          <span className="provider-name">{appointment.provider.name}</span>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="timeslot-time">
                                {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && ` (${timeslot.service.name})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'byProvider' && (
              <div className="by-provider-tab">
                {Object.entries(recapData.byProvider).map(([providerName, providerData]) => (
                  <div key={providerName} className="provider-summary">
                    <h3>{providerName}</h3>
                    <p>{providerData.appointments.length} appointments, {providerData.timeslotCount} timeslots</p>
                    <p>Patients: {providerData.patients.join(', ')}</p>                    <div className="appointments-list">
                      {providerData.appointments.map((appointment, index) => (
                        <div key={index} className="appointment-summary">
                          <span className="patient-name">{appointment.patient.name}</span>
                          <span className="date">{formatDate(appointment.date)}</span>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="timeslot-time">
                                {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && ` (${timeslot.service.name})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'byPatient' && (
              <div className="by-patient-tab">
                {Object.entries(recapData.byPatient).map(([patientName, patientData]) => (
                  <div key={patientName} className="patient-summary">
                    <h3>{patientName}</h3>
                    <p>{patientData.appointments.length} appointments, {patientData.timeslotCount} timeslots</p>
                    <p>Providers: {patientData.providers.join(', ')}</p>                    <div className="appointments-list">
                      {patientData.appointments.map((appointment, index) => (
                        <div key={index} className="appointment-summary">
                          <span className="provider-name">{appointment.provider.name}</span>
                          <span className="date">{formatDate(appointment.date)}</span>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="timeslot-time">
                                {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && ` (${timeslot.service.name})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to get status-based CSS class
  const getStatusClass = (status) => {
    if (!status) return 'status-scheduled'; // Default fallback
    
    // Normalize status (handle potential variations)
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    
    // Valid status classes that match our CSS
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    
    if (validStatuses.includes(normalizedStatus)) {
      return `status-${normalizedStatus}`;
    }
    
    return 'status-scheduled'; // Default fallback
  };

  // Helper function to get the primary status for a time slot (when multiple timeslots exist)
  const getPrimaryTimeSlotStatus = (timeslots) => {
    if (!timeslots || timeslots.length === 0) return 'available';
    
    // Priority order: in_progress > confirmed > scheduled > completed > cancelled > no_show
    const statusPriority = {
      'in_progress': 6,
      'confirmed': 5,
      'scheduled': 4,
      'completed': 3,
      'cancelled': 2,
      'no_show': 1
    };
    
    let highestPriority = 0;
    let primaryStatus = 'scheduled';
    
    timeslots.forEach(timeslot => {
      const status = timeslot.status || 'scheduled';
      const priority = statusPriority[status] || statusPriority['scheduled'];
      
      if (priority > highestPriority) {
        highestPriority = priority;
        primaryStatus = status;
      }
    });
    
    return getStatusClass(primaryStatus);
  };

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        <div className="calendar-title">
          <h1>Schedule Calendar</h1>
          <p>Coordinator Dashboard</p>
        </div>
        
        <div className="calendar-controls">
          <div className="view-controls">
            <button
              className={viewType === 'day' ? 'active' : ''}
              onClick={() => setViewType('day')}
            >
              Day
            </button>
            <button
              className={viewType === 'week' ? 'active' : ''}
              onClick={() => setViewType('week')}
            >
              Week
            </button>
            <button
              className={viewType === 'month' ? 'active' : ''}
              onClick={() => setViewType('month')}
            >
              Month
            </button>
          </div>

          <div className="date-navigation">
            <button onClick={() => navigateDate(-1)}>‹</button>
            <span className="current-date">{getViewTitle()}</span>
            <button onClick={() => navigateDate(1)}>›</button>
          </div>          <button 
            className="quick-schedule-btn"
            onClick={() => setShowQuickSchedule(true)}
          >
            + Quick Schedule
          </button>
            <button 
            className="recurring-schedule-btn"
            onClick={() => setShowRecurringSchedule(true)}
            style={{
              background: '#22C7EE',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s',
              marginLeft: '8px'
            }}
          >
            🔄 Recurring Schedule
          </button>
          
          <button 
            className="recap-btn"
            onClick={() => setShowRecapModal(true)}
          >
            📊 View Summary
          </button>
        </div>
      </div>

      <div className="calendar-filters">
        <div className="provider-filter">
          <label htmlFor="provider-select">Filter by Provider:</label>
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="">All Providers</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.service}
              </option>
            ))}
          </select>
        </div>

        <div className="status-filter">
          <label htmlFor="status-select">Filter by Status:</label>
          <select
            id="status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>        </div>
      </div>

      {stats && Object.keys(stats).length > 0 && (
        <div className="calendar-stats">
          <div className="stat-card">
            <h3>{stats.total_schedules}</h3>
            <p>Total Schedules</p>
          </div>
          <div className="stat-card">
            <h3>{stats.total_timeslots}</h3>
            <p>Time Slots</p>
          </div>
          <div className="stat-card">
            <h3>{stats.pending_demands}</h3>
            <p>Pending Demands</p>
          </div>
          <div className="stat-card">
            <h3>{stats.utilization_rate}%</h3>
            <p>Utilization Rate</p>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}      {loading ? (
        <div className="loading">
          <p>Loading calendar data...</p>
        </div>
      ) : (
        <div className="calendar-content">
          {viewType === 'week' ? (
            <WeekView 
              calendarData={calendarData} 
              currentDate={currentDate}
              onTimeSlotClick={handleTimeSlotClick}
              onAppointmentEdit={handleAppointmentEdit}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={isDragging}
            />
          ) : viewType === 'day' ? (
            <DayView 
              calendarData={calendarData} 
              currentDate={currentDate}
              onTimeSlotClick={handleTimeSlotClick}
              onAppointmentEdit={handleAppointmentEdit}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={isDragging}
            />
          ) : (
            <MonthView 
              calendarData={calendarData} 
              currentDate={currentDate}
              onDayClick={handleDayClick}
            />
          )}
        </div>
      )}      {/* Quick Schedule Modal */}
      <QuickSchedule
        isOpen={showQuickSchedule}
        onClose={() => {
          setShowQuickSchedule(false);
          setSelectedTimeSlot(null);
        }}        onScheduleCreated={(data) => {
          console.log('Schedule created:', data);
          fetchCalendarData(true);
        }}
        providers={providers}
        preselectedDate={selectedTimeSlot?.date}
        preselectedTime={selectedTimeSlot?.time}
      />

      {/* Recurring Schedule Modal */}
      <RecurringSchedule
        isOpen={showRecurringSchedule}
        onClose={() => {
          setShowRecurringSchedule(false);
          setSelectedTimeSlot(null);
        }}
        onScheduleCreated={(data) => {
          console.log('Recurring schedule created:', data);
          fetchCalendarData(true);
        }}
        providers={providers}
        preselectedDate={selectedTimeSlot?.date}
        preselectedTime={selectedTimeSlot?.time}
      />      {/* Edit Appointment Modal */}
      {showEditAppointment && (
        <EditAppointment
          isOpen={showEditAppointment}
          appointment={selectedAppointment}
          onClose={() => {
            setShowEditAppointment(false);
            setSelectedAppointment(null);
          }}          onAppointmentUpdated={(data) => {
            console.log('Appointment updated:', data);
            fetchCalendarData(true);
          }}          onAppointmentDeleted={() => {
            console.log('Appointment deleted');
            fetchCalendarData(true);
          }}
          providers={providers}
        />
      )}

      {/* Recap/Summary Modal */}
      {showRecapModal && (
        <RecapModal
          isOpen={showRecapModal}
          onClose={() => setShowRecapModal(false)}
          recapData={generateRecapData()}
        />
      )}
    </div>
  );
};

export default ScheduleCalendar;
