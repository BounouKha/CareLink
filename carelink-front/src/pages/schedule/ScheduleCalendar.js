import React, { useState, useEffect } from 'react';
import './ScheduleCalendar.css';
import QuickSchedule from './QuickSchedule';
import EditAppointment from './EditAppointment';
import RecurringSchedule from './features/RecurringSchedule';
import { useLoading } from '../../hooks/useLoading';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import { 
  PageLoadingOverlay, 
  ComponentLoadingOverlay,
  CalendarLoading,
  StatsLoading,
  SpinnerOnly
} from '../../components/LoadingComponents';

const ScheduleCalendar = () => {
  // Translation hooks
  const { schedule, common, errors: errorsT } = useCareTranslation();
  
  const [calendarData, setCalendarData] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // Add status filter
  const [viewType, setViewType] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  
  // Enhanced loading states
  const { 
    isLoading: isPageLoading, 
    executeWithLoading 
  } = useLoading();
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);const [showQuickSchedule, setShowQuickSchedule] = useState(false);  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
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
    
    try {
      setRefreshing(true);
      
      // Preserve scroll position if requested
      if (preserveScroll) {
        preserveScrollPosition();
        console.log('Preserving scroll position:', scrollPosition);
      }
      
      setIsCalendarLoading(true);
      setError('');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access the schedule');
        throw new Error('No access token');
      }

      // Calculate date range based on view type
      const { startDate, endDate } = getDateRange(currentDate, viewType);
      
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        view: viewType
      });

      if (selectedProvider) {
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
        
        // Enhanced debugging for appointment data
        if (data.calendar_data && data.calendar_data.length > 0) {
          console.log('Sample appointment data:', data.calendar_data[0]);
          console.log('All appointments:', data.calendar_data.map(appt => ({
            id: appt.id,
            date: appt.date,
            patient: appt.patient ? appt.patient.name : 'NO PATIENT (BLOCKED TIME)',
            provider: appt.provider ? appt.provider.name : 'NO PROVIDER',
            timeslots: appt.timeslots?.length || 0,
            notes: appt.notes || 'No notes'
          })));
        }
        
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
        throw new Error(errorData.error || 'Failed to fetch calendar data');
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError(error.message || 'Failed to fetch calendar data');
    } finally {
      setIsCalendarLoading(false);
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
      const providerName = appointment.provider?.name || 'Unknown Provider';
      const patientName = appointment.patient?.name || 'Blocked Time';
      
      providersSet.add(providerName);
      if (appointment.patient) {
        patientsSet.add(patientName);
      }

      // Group by day
      if (!recap.byDay[date]) {
        recap.byDay[date] = {
          appointments: [],
          timeslotCount: 0
        };
      }
      recap.byDay[date].appointments.push(appointment);
      recap.byDay[date].timeslotCount += appointment.timeslots?.length || 0;

      // Group by provider
      if (!recap.byProvider[providerName]) {
        recap.byProvider[providerName] = {
          appointments: [],
          timeslotCount: 0,
          patients: new Set()
        };
      }
      recap.byProvider[providerName].appointments.push(appointment);
      recap.byProvider[providerName].timeslotCount += appointment.timeslots?.length || 0;
      if (appointment.patient) {
        recap.byProvider[providerName].patients.add(patientName);
      }

      // Group by patient (only if patient exists)
      if (appointment.patient) {
        if (!recap.byPatient[patientName]) {
          recap.byPatient[patientName] = {
            appointments: [],
            timeslotCount: 0,
            providers: new Set()
          };
        }
        recap.byPatient[patientName].appointments.push(appointment);
        recap.byPatient[patientName].timeslotCount += appointment.timeslots?.length || 0;
        recap.byPatient[patientName].providers.add(providerName);
      }

      // Update totals
      recap.totals.totalTimeslots += appointment.timeslots?.length || 0;
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
  };const handleTimeSlotClick = (date, time) => {
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
    // Generate 30-minute time slots from 6am to 11pm (23h) to include appointments ending at 23:00
    for (let hour = 6; hour <= 23; hour += 1) {
      // Add both :00 and :30 minute slots for each hour
      const timeHour = `${hour.toString().padStart(2, '0')}:00`;
      const timeHalf = `${hour.toString().padStart(2, '0')}:30`;
      slots.push(timeHour);
      slots.push(timeHalf);
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
    }    return (
      <div className="week-view">
        <div className="week-header">
          <div className="time-column-header">{schedule('time')}</div>
          {weekDays.map(date => (
            <div key={date.toISOString()} className="day-header">
              <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="day-number">{date.getDate()}</div>
            </div>
          ))}
        </div><div className="week-grid">
          {timeSlots.map(time => (
            <div key={time} className="time-row">              <div className="time-label">{formatTime(time + ':00')}</div>
              {weekDays.map(date => {
                const dateStr = formatDateToString(date);
                
                // Get all timeslots for this time slot (individual timeslots, not grouped by appointment)
                const timeslots = getTimeslotsForTimeSlot(dateStr, time);                  return (
                  <div 
                    key={`${dateStr}-${time}`} 
                    className={`time-slot ${timeslots.length > 0 ? 'occupied' : 'available'} ${isDragging && timeslots.length === 0 ? 'drop-zone' : ''} ${timeslots.length > 1 ? 'multiple-timeslots' : ''}`}
                    onClick={() => timeslots.length === 0 ? onTimeSlotClick(dateStr, time) : null}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, dateStr, time)}
                  >
                    {timeslots.length > 0 && (
                      <div className={`timeslots-container ${timeslots.length > 1 ? 'multiple' : ''}`}>
                        {timeslots.map((timeslot, index) => (
                          <div 
                            key={`${timeslot.appointmentId}-${timeslot.id}-${index}`}
                            className={`timeslot-item ${timeslots.length > 1 ? 'compact' : ''} ${getStatusClass(timeslot.status)} ${getAppointmentClass(timeslot.schedule)}`}
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
                              verticalAlign: 'top'                            }}
                            title={getAppointmentTitle(timeslot)}
                          >
                            <div className="timeslot-patient">{getPatientDisplay(timeslot.schedule)}</div>
                            <div className="timeslot-provider">{getProviderDisplay(timeslot.schedule)}</div>
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
                className={`time-slot ${timeslots.length > 0 ? 'occupied' : 'available'} ${isDragging && timeslots.length === 0 ? 'drop-zone' : ''} ${timeslots.length > 1 ? 'multiple-timeslots' : ''}`}
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
                          className={`timeslot-item ${timeslots.length > 1 ? 'compact' : ''} ${getStatusClass(timeslot.status)} ${getAppointmentClass(timeslot.schedule)}`}
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
                          }}                          title={getAppointmentTitle(timeslot)}
                        >
                          <div className="timeslot-patient">{getPatientDisplay(timeslot.schedule)}</div>
                          <div className="timeslot-provider">{getProviderDisplay(timeslot.schedule)}</div>
                          {timeslot.service?.name && (
                            <div className="timeslot-service">{timeslot.service.name}</div>
                          )}
                          {timeslots.length === 1 && <div className="drag-handle">⋮⋮</div>}
                        </div>
                      ))}
                    </div>                  ) : (
                    <div className="slot-placeholder">{schedule('clickToSchedule')}</div>
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
                    <div key={index} className={`appointment-dot ${getStatusClass(appointment.status)}`} title={`${getPatientDisplay(appointment)} - ${getTranslatedStatus(appointment.status || 'scheduled')}`}>
                      {getPatientDisplay(appointment).charAt(0)}
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
  // Enhanced Recap Modal Component with Charts and Better Analytics
  const RecapModal = ({ isOpen, onClose, recapData }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showExportOptions, setShowExportOptions] = useState(false);

    if (!isOpen) return null;

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatShortDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    // Calculate advanced analytics
    const analytics = {
      avgAppointmentsPerDay: (recapData.totals.totalAppointments / Object.keys(recapData.byDay).length).toFixed(1),
      avgTimeslotsPerAppointment: (recapData.totals.totalTimeslots / recapData.totals.totalAppointments).toFixed(1),
      avgPatientsPerProvider: (recapData.totals.totalPatients / recapData.totals.totalProviders).toFixed(1),
      busiesDay: Object.entries(recapData.byDay).reduce((busiest, [date, data]) => 
        data.appointments.length > (busiest.count || 0) ? { date, count: data.appointments.length } : busiest, {}),
      mostActiveProvider: Object.entries(recapData.byProvider).reduce((most, [name, data]) => 
        data.appointments.length > (most.count || 0) ? { name, count: data.appointments.length } : most, {}),
      patientWithMostAppointments: Object.entries(recapData.byPatient).reduce((most, [name, data]) => 
        data.appointments.length > (most.count || 0) ? { name, count: data.appointments.length } : most, {})
    };

    // Export function
    const exportData = (format) => {
      const exportDate = new Date().toLocaleDateString();
      const viewTitle = getViewTitle();
      
      if (format === 'csv') {
        let csvContent = `Schedule Summary Report - ${viewTitle}\nGenerated on: ${exportDate}\n\n`;
        
        // Add overview
        csvContent += "OVERVIEW\n";
        csvContent += `Total Appointments,${recapData.totals.totalAppointments}\n`;
        csvContent += `Total Timeslots,${recapData.totals.totalTimeslots}\n`;
        csvContent += `Total Providers,${recapData.totals.totalProviders}\n`;
        csvContent += `Total Patients,${recapData.totals.totalPatients}\n\n`;
        
        // Add by day data
        csvContent += "BY DAY\n";
        csvContent += "Date,Appointments,Timeslots\n";
        Object.entries(recapData.byDay).forEach(([date, data]) => {
          csvContent += `${date},${data.appointments.length},${data.timeslotCount}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule-summary-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
      
      setShowExportOptions(false);
    };

    // Simple chart component using CSS
    const BarChart = ({ data, maxHeight = 60 }) => (
      <div className="chart-container">
        {Object.entries(data).map(([key, value]) => {
          const height = Math.max((value.appointments?.length || value) / Math.max(...Object.values(data).map(v => v.appointments?.length || v)) * maxHeight, 2);
          return (
            <div key={key} className="chart-bar-container">
              <div className="chart-bar" style={{ height: `${height}px` }}>
                <span className="chart-value">{value.appointments?.length || value}</span>
              </div>
              <span className="chart-label">{key.length > 8 ? `${key.slice(0, 8)}...` : key}</span>
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="modal-overlay" onClick={onClose}>        <div className="enhanced-recap-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="header-content">
              <h2>📊 {schedule('scheduleAnalyticsDashboard')}</h2>
              <p className="period-info">{getViewTitle()}</p>
            </div>
            <div className="header-actions">
              <div className="export-dropdown">
                <button 
                  className="export-btn "
                  onClick={() => setShowExportOptions(!showExportOptions)}
                >
                  📥 {schedule('export')}
                </button>
                {showExportOptions && (
                  <div className="export-menu bg-white shadow-lg">
                    <button onClick={() => exportData('csv')}>📄 {schedule('exportAsCSV')}</button>
                  </div>
                )}
              </div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
          </div>          <div className="recap-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📈 {schedule('overview')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              🔍 {schedule('analytics')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byDay' ? 'active' : ''}`}
              onClick={() => setActiveTab('byDay')}
            >
              📅 {schedule('byDay')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byProvider' ? 'active' : ''}`}
              onClick={() => setActiveTab('byProvider')}
            >
              👩‍⚕️ {schedule('byProvider')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'byPatient' ? 'active' : ''}`}
              onClick={() => setActiveTab('byPatient')}
            >
              👤 {schedule('byPatient')}
            </button>
          </div>

          <div className="recap-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">                <div className="stats-grid">
                  <div className="stat-card primary">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                      <h3>{recapData.totals.totalAppointments}</h3>
                      <p>{schedule('totalAppointments')}</p>
                      <span className="stat-trend">↗️ {schedule('active')}</span>
                    </div>
                  </div>
                  <div className="stat-card secondary">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                      <h3>{recapData.totals.totalTimeslots}</h3>
                      <p>{schedule('totalTimeslots')}</p>
                      <span className="stat-trend">📊 {analytics.avgTimeslotsPerAppointment} {schedule('avgPerAppointment')}</span>
                    </div>
                  </div>
                  <div className="stat-card success">
                    <div className="stat-icon">👩‍⚕️</div>
                    <div className="stat-content">
                      <h3>{recapData.totals.totalProviders}</h3>
                      <p>{schedule('activeProviders')}</p>
                      <span className="stat-trend">👥 {analytics.avgPatientsPerProvider} {schedule('patientsPerProvider')}</span>
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-icon">👤</div>
                    <div className="stat-content">                      <h3>{recapData.totals.totalPatients}</h3>
                      <p>{schedule('totalPatientsInsights')}</p>
                      <span className="stat-trend">📈 {analytics.avgAppointmentsPerDay} {schedule('appointmentsPerDay')}</span>
                    </div>
                  </div>
                </div>
                  <div className="quick-insights">
                  <h3>🚀 {schedule('quickInsights')}</h3>
                  <div className="insights-grid">
                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">📈</span>
                        <span className="insight-title">{schedule('busiestDay')}</span>
                      </div>
                      <div className="insight-content">
                        <strong>{analytics.busiesDay.date ? formatShortDate(analytics.busiesDay.date) : schedule('notAvailable')}</strong>
                        <p>{analytics.busiesDay.count || 0} {schedule('appointments')}</p>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">⭐</span>
                        <span className="insight-title">{schedule('topProvider')}</span>
                      </div>
                      <div className="insight-content">
                        <strong>{analytics.mostActiveProvider.name || schedule('notAvailable')}</strong>
                        <p>{analytics.mostActiveProvider.count || 0} {schedule('appointments')}</p>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">🎯</span>
                        <span className="insight-title">Most Active Patient</span>
                      </div>
                      <div className="insight-content">
                        <strong>{analytics.patientWithMostAppointments.name || 'N/A'}</strong>
                        <p>{analytics.patientWithMostAppointments.count || 0} appointments</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-tab">
                <div className="chart-section">
                  <h3>📊 Appointments by Day</h3>
                  <BarChart data={recapData.byDay} />
                </div>
                
                <div className="chart-section">
                  <h3>👩‍⚕️ Appointments by Provider</h3>
                  <BarChart data={recapData.byProvider} />
                </div>
                
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h4>📈 Daily Average</h4>
                    <div className="metric-value">{analytics.avgAppointmentsPerDay}</div>
                    <p>appointments per day</p>
                  </div>
                  <div className="metric-card">
                    <h4>⏱️ Session Length</h4>
                    <div className="metric-value">{analytics.avgTimeslotsPerAppointment}</div>
                    <p>timeslots per appointment</p>
                  </div>
                  <div className="metric-card">
                    <h4>👥 Provider Load</h4>
                    <div className="metric-value">{analytics.avgPatientsPerProvider}</div>
                    <p>patients per provider</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'byDay' && (
              <div className="by-day-tab">
                {Object.entries(recapData.byDay).map(([date, dayData]) => (
                  <div key={date} className="enhanced-day-summary">
                    <div className="day-header">
                      <div className="day-info">
                        <h3>{formatDate(date)}</h3>                        <div className="day-stats">
                          <span className="stat-badge appointments">📅 {dayData.appointments.length} {schedule('appointments')}</span>
                          <span className="stat-badge timeslots">⏰ {dayData.timeslotCount} {schedule('timeslots')}</span>
                        </div>
                      </div>
                      <div className="day-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${(dayData.appointments.length / Math.max(...Object.values(recapData.byDay).map(d => d.appointments.length))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="appointments-grid">
                      {dayData.appointments.map((appointment, index) => (
                        <div key={index} className="enhanced-appointment-card">                          <div className="appointment-header">
                            <span className="patient-name">👤 {getPatientDisplay(appointment)}</span>
                            <span className="provider-name">👩‍⚕️ {getProviderDisplay(appointment)}</span>
                          </div>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="enhanced-timeslot-time">
                                ⏰ {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && <span className="service-tag">🔧 {timeslot.service.name}</span>}
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
                  <div key={providerName} className="enhanced-provider-summary">
                    <div className="provider-header">
                      <div className="provider-info">
                        <h3>👩‍⚕️ {providerName}</h3>                        <div className="provider-stats">
                          <span className="stat-badge appointments">📅 {providerData.appointments.length} {schedule('appointments')}</span>
                          <span className="stat-badge patients">👥 {providerData.patients.length} {schedule('patients')}</span>
                          <span className="stat-badge timeslots">⏰ {providerData.timeslotCount} {schedule('timeslots')}</span>
                        </div>
                        <div className="patients-list">
                          <strong>{schedule('patients')}:</strong> {providerData.patients.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="appointments-grid">
                      {providerData.appointments.map((appointment, index) => (
                        <div key={index} className="enhanced-appointment-card">                          <div className="appointment-header">
                            <span className="patient-name">👤 {getPatientDisplay(appointment)}</span>
                            <span className="date">📅 {formatShortDate(appointment.date)}</span>
                          </div>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="enhanced-timeslot-time">
                                ⏰ {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && <span className="service-tag">🔧 {timeslot.service.name}</span>}
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
                  <div key={patientName} className="enhanced-patient-summary">
                    <div className="patient-header">
                      <div className="patient-info">
                        <h3>👤 {patientName}</h3>                        <div className="patient-stats">
                          <span className="stat-badge appointments">📅 {patientData.appointments.length} {schedule('appointments')}</span>
                          <span className="stat-badge providers">👩‍⚕️ {patientData.providers.length} {schedule('providers')}</span>
                          <span className="stat-badge timeslots">⏰ {patientData.timeslotCount} {schedule('timeslots')}</span>
                        </div>
                        <div className="providers-list">
                          <strong>{schedule('providers')}:</strong> {patientData.providers.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="appointments-grid">
                      {patientData.appointments.map((appointment, index) => (
                        <div key={index} className="enhanced-appointment-card">
                          <div className="appointment-header">
                            <span className="provider-name">👩‍⚕️ {appointment.provider.name}</span>
                            <span className="date">📅 {formatShortDate(appointment.date)}</span>
                          </div>
                          <div className="timeslots-detail">
                            {appointment.timeslots.map((timeslot, tsIndex) => (
                              <span key={tsIndex} className="enhanced-timeslot-time">
                                ⏰ {timeslot.start_time} - {timeslot.end_time}
                                {timeslot.service && <span className="service-tag">🔧 {timeslot.service.name}</span>}
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

  // Helper functions to safely render appointment data
  const getPatientDisplay = (appointment) => {
    if (!appointment.patient) {
      // Check notes for specific types of blocked time
      const notes = appointment.notes?.toLowerCase() || '';
      if (notes.includes('meal') || notes.includes('lunch') || notes.includes('break')) {
        return '🍽️ Meal Break';
      } else if (notes.includes('admin') || notes.includes('office')) {
        return '📋 Admin Time';
      } else if (notes.includes('free') || notes.includes('available')) {
        return '✅ Free Time';
      } else {
        return '🚫 Blocked Time';
      }
    }
    return appointment.patient.name;
  };

  const getProviderDisplay = (appointment) => {
    return appointment.provider?.name || 'Unknown Provider';
  };

  const getAppointmentTitle = (timeslot) => {
    const patient = getPatientDisplay(timeslot.schedule);
    const provider = getProviderDisplay(timeslot.schedule);
    const service = timeslot.service?.name || 'No Service';
    const time = `${timeslot.start_time} - ${timeslot.end_time}`;
    const notes = timeslot.schedule.notes ? `\nNotes: ${timeslot.schedule.notes}` : '';
    return `${patient} - ${provider}\nService: ${service}\nTime: ${time}${notes}`;
  };

  // Helper function to get appointment CSS class
  const getAppointmentClass = (appointment) => {
    if (!appointment.patient) {
      return 'blocked-appointment';
    }
    return '';
  };

  return (
    <div className="schedule-calendar">
      {/* Page loading overlay for navigation only */}
      {isPageLoading && (
        <div className="simple-loading-container">
          <SpinnerOnly size="large" />
        </div>
      )}
        <div className="calendar-header">
        <div className="calendar-title">
          <h1>{schedule('scheduleCalendar')}</h1>
          <p>{schedule('coordinatorDashboard')}</p>
        </div>
        
        <div className="calendar-controls">          <div className="view-controls">
            <button
              className={viewType === 'day' ? 'active' : ''}
              onClick={() => setViewType('day')}
            >
              {schedule('viewTypes.day')}
            </button>
            <button
              className={viewType === 'week' ? 'active' : ''}
              onClick={() => setViewType('week')}
            >
              {schedule('viewTypes.week')}
            </button>
            <button
              className={viewType === 'month' ? 'active' : ''}
              onClick={() => setViewType('month')}
            >
              {schedule('viewTypes.month')}
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
            + {schedule('quickSchedule')}
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
            🔄 {schedule('recurringSchedule')}
          </button>
          
          <button 
            className="recap-btn"
            onClick={() => setShowRecapModal(true)}
          >
            📊 {schedule('viewSummary')}
          </button>
        </div>
      </div>      <div className="calendar-filters">
        <div className="provider-filter">
          <label htmlFor="provider-select">{schedule('filterByProvider')}:</label>
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="">{schedule('allProviders')}</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.service}
              </option>
            ))}
          </select>
        </div>

        <div className="status-filter">
          <label htmlFor="status-select">{schedule('filterByStatus')}:</label>
          <select
            id="status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >            <option value="">{schedule('allStatuses')}</option>
            <option value="scheduled">{schedule('statusOptions.scheduled')}</option>
            <option value="confirmed">{schedule('statusOptions.confirmed')}</option>
            <option value="in_progress">{schedule('statusOptions.inProgress')}</option>
            <option value="completed">{schedule('statusOptions.completed')}</option>
            <option value="cancelled">{schedule('statusOptions.cancelled')}</option>
            <option value="no_show">{schedule('statusOptions.noShow')}</option>
          </select>        </div>
      </div>      {stats && Object.keys(stats).length > 0 && (
        <div className="calendar-stats">
          <div className="stat-card">
            <h3>{stats.total_schedules}</h3>
            <p>{schedule('totalSchedules')}</p>
          </div>
          <div className="stat-card">
            <h3>{stats.total_timeslots}</h3>
            <p>{schedule('timeSlots')}</p>
          </div>
          <div className="stat-card">
            <h3>{stats.pending_demands}</h3>
            <p>{schedule('pendingDemands')}</p>
          </div>
          <div className="stat-card">
            <h3>{stats.utilization_rate}%</h3>
            <p>{schedule('utilizationRate')}</p>
          </div>
        </div>      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}      {isCalendarLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <SpinnerOnly size="large" />
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
