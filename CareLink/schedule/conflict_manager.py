# CareLink/schedule/conflict_manager.py
from datetime import datetime, time, timedelta
from django.db.models import Q
from CareLink.models import Schedule, TimeSlot, Provider, Patient

class ConflictManager:
    """
    Comprehensive conflict detection and management system for scheduling
    """
    
    @staticmethod
    def check_scheduling_conflicts(provider_id, patient_id, date, start_time, end_time, exclude_schedule_id=None, exclude_timeslot_id=None):
        """
        Check for various types of scheduling conflicts
        
        Args:
            provider_id: ID of the provider
            patient_id: ID of the patient (optional for blocked time)
            date: Date of the appointment (date object or string)
            start_time: Start time (time object or string)
            end_time: End time (time object or string)
            exclude_schedule_id: Schedule ID to exclude from conflict check (for updates)
            exclude_timeslot_id: TimeSlot ID to exclude from conflict check (for updates)
            
        Returns:
            dict: {
                'has_conflicts': bool,
                'conflicts': [list of conflict objects],
                'severity': 'low' | 'medium' | 'high'
            }
        """
        conflicts = []
        
        # Parse date and times
        if isinstance(date, str):
            date = datetime.strptime(date, '%Y-%m-%d').date()
        if isinstance(start_time, str):
            start_time = datetime.strptime(start_time, '%H:%M').time()
        if isinstance(end_time, str):
            end_time = datetime.strptime(end_time, '%H:%M').time()
        
        # Check provider conflicts
        provider_conflicts = ConflictManager._check_provider_conflicts(
            provider_id, date, start_time, end_time, exclude_schedule_id, exclude_timeslot_id
        )
        conflicts.extend(provider_conflicts)
        
        # Check patient conflicts only if patient_id is provided (skip for blocked time)
        if patient_id:
            patient_conflicts = ConflictManager._check_patient_conflicts(
                patient_id, date, start_time, end_time, exclude_schedule_id, exclude_timeslot_id
            )
            conflicts.extend(patient_conflicts)
            
            # Check for double booking (same provider + patient combination)
            double_booking_conflicts = ConflictManager._check_double_booking(
                provider_id, patient_id, date, start_time, end_time, exclude_schedule_id, exclude_timeslot_id
            )
            conflicts.extend(double_booking_conflicts)
        
        # Determine overall severity
        severity = ConflictManager._calculate_severity(conflicts)
        
        return {
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts,
            'severity': severity,
            'conflict_count': len(conflicts)
        }
    
    @staticmethod
    def _check_provider_conflicts(provider_id, date, start_time, end_time, exclude_schedule_id=None, exclude_timeslot_id=None):
        """Check for provider scheduling conflicts"""
        conflicts = []
        
        try:
            provider = Provider.objects.get(id=provider_id)
              # Get all timeslots for this provider on this date that overlap with the requested time
            conflicting_timeslots = TimeSlot.objects.filter(
                schedule__provider=provider,
                schedule__date=date,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            # Exclude current schedule/timeslot if updating
            if exclude_schedule_id:
                conflicting_timeslots = conflicting_timeslots.exclude(schedule__id=exclude_schedule_id)
            if exclude_timeslot_id:
                conflicting_timeslots = conflicting_timeslots.exclude(id=exclude_timeslot_id)
            
            for timeslot in conflicting_timeslots:
                schedule = timeslot.schedule_set.first()
                if schedule:
                    overlap_start = max(start_time, timeslot.start_time)
                    overlap_end = min(end_time, timeslot.end_time)
                    overlap_minutes = ConflictManager._calculate_overlap_minutes(overlap_start, overlap_end)
                    
                    conflict = {
                        'type': 'provider',
                        'severity': 'high',  # Provider conflicts are always high severity
                        'message': f"Provider {provider.user.firstname} {provider.user.lastname} already has an appointment during this time.",
                        'overlap_minutes': overlap_minutes,
                        'existing_appointment': {
                            'id': schedule.id,
                            'start_time': timeslot.start_time,
                            'end_time': timeslot.end_time,
                            'patient_name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else 'Unknown Patient',
                            'service': timeslot.service.name if timeslot.service else 'General Consultation',
                            'status': getattr(timeslot, 'status', 'scheduled')
                        },
                        'suggestions': [
                            f"Choose a different time slot (before {timeslot.start_time} or after {timeslot.end_time})",
                            "Select a different provider",
                            "Reschedule the existing appointment"
                        ]
                    }
                    conflicts.append(conflict)
                    
        except Provider.DoesNotExist:
            conflicts.append({
                'type': 'provider',
                'severity': 'high',
                'message': 'Provider not found.',
                'suggestions': ['Please select a valid provider']
            })
        
        return conflicts
    
    @staticmethod
    def _check_patient_conflicts(patient_id, date, start_time, end_time, exclude_schedule_id=None, exclude_timeslot_id=None):
        """Check for patient scheduling conflicts"""
        conflicts = []
        
        try:
            patient = Patient.objects.get(id=patient_id)
              # Get all timeslots for this patient on this date that overlap with the requested time
            conflicting_timeslots = TimeSlot.objects.filter(
                schedule__patient=patient,
                schedule__date=date,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            # Exclude current schedule/timeslot if updating
            if exclude_schedule_id:
                conflicting_timeslots = conflicting_timeslots.exclude(schedule__id=exclude_schedule_id)
            if exclude_timeslot_id:
                conflicting_timeslots = conflicting_timeslots.exclude(id=exclude_timeslot_id)
            
            for timeslot in conflicting_timeslots:
                schedule = timeslot.schedule_set.first()
                if schedule:
                    overlap_start = max(start_time, timeslot.start_time)
                    overlap_end = min(end_time, timeslot.end_time)
                    overlap_minutes = ConflictManager._calculate_overlap_minutes(overlap_start, overlap_end)
                    
                    # Determine severity based on overlap
                    if overlap_minutes >= 30:
                        severity = 'high'
                    elif overlap_minutes >= 15:
                        severity = 'medium'
                    else:
                        severity = 'low'
                    
                    conflict = {
                        'type': 'patient',
                        'severity': severity,
                        'message': f"Patient {patient.user.firstname} {patient.user.lastname} already has an appointment during this time.",
                        'overlap_minutes': overlap_minutes,
                        'existing_appointment': {
                            'id': schedule.id,
                            'start_time': timeslot.start_time,
                            'end_time': timeslot.end_time,
                            'provider_name': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Unknown Provider',
                            'service': timeslot.service.name if timeslot.service else 'General Consultation',
                            'status': getattr(timeslot, 'status', 'scheduled')
                        },
                        'suggestions': [
                            f"Choose a different time slot (before {timeslot.start_time} or after {timeslot.end_time})",
                            "Reschedule the existing appointment",
                            "Consider combining appointments if appropriate"
                        ]
                    }
                    conflicts.append(conflict)
                    
        except Patient.DoesNotExist:
            conflicts.append({
                'type': 'patient',
                'severity': 'high',
                'message': 'Patient not found.',
                'suggestions': ['Please select a valid patient']
            })
        
        return conflicts
    
    @staticmethod
    def _check_double_booking(provider_id, patient_id, date, start_time, end_time, exclude_schedule_id=None, exclude_timeslot_id=None):
        """Check for double booking (same provider + patient combination)"""
        conflicts = []
        
        try:
            # Check if the same provider-patient combination already exists for this date
            existing_schedules = Schedule.objects.filter(
                provider_id=provider_id,
                patient_id=patient_id,
                date=date
            )
            
            # Exclude current schedule if updating
            if exclude_schedule_id:
                existing_schedules = existing_schedules.exclude(id=exclude_schedule_id)
            
            if existing_schedules.exists():
                for schedule in existing_schedules:
                    timeslots = schedule.time_slots.all()
                    if exclude_timeslot_id:
                        timeslots = timeslots.exclude(id=exclude_timeslot_id)
                    
                    for timeslot in timeslots:
                        # Check if there's any time overlap
                        if timeslot.start_time < end_time and timeslot.end_time > start_time:
                            overlap_start = max(start_time, timeslot.start_time)
                            overlap_end = min(end_time, timeslot.end_time)
                            overlap_minutes = ConflictManager._calculate_overlap_minutes(overlap_start, overlap_end)
                            
                            conflict = {
                                'type': 'double_booking',
                                'severity': 'medium',
                                'message': f"This provider-patient combination already has an appointment on this date.",
                                'overlap_minutes': overlap_minutes,
                                'existing_appointment': {
                                    'id': schedule.id,
                                    'start_time': timeslot.start_time,
                                    'end_time': timeslot.end_time,
                                    'service': timeslot.service.name if timeslot.service else 'General Consultation',
                                    'status': getattr(timeslot, 'status', 'scheduled')
                                },
                                'suggestions': [
                                    "Consider extending the existing appointment",
                                    "Schedule for a different date",
                                    "Combine both appointments into one longer session"
                                ]
                            }
                            conflicts.append(conflict)
                        else:
                            # Same day but different times - lower severity
                            conflict = {
                                'type': 'same_day_booking',
                                'severity': 'low',
                                'message': f"This provider-patient combination already has another appointment on the same day.",
                                'existing_appointment': {
                                    'id': schedule.id,
                                    'start_time': timeslot.start_time,
                                    'end_time': timeslot.end_time,
                                    'service': timeslot.service.name if timeslot.service else 'General Consultation',
                                    'status': getattr(timeslot, 'status', 'scheduled')
                                },
                                'suggestions': [
                                    "Consider spacing appointments further apart",
                                    "Combine into one longer appointment if appropriate"
                                ]
                            }
                            conflicts.append(conflict)
                            
        except Exception as e:
            conflicts.append({
                'type': 'system',
                'severity': 'high',
                'message': f'Error checking for double booking: {str(e)}',
                'suggestions': ['Please try again or contact system administrator']
            })
        
        return conflicts
    
    @staticmethod
    def _calculate_overlap_minutes(start_time, end_time):
        """Calculate overlap in minutes between two time periods"""
        try:
            start_datetime = datetime.combine(datetime.today().date(), start_time)
            end_datetime = datetime.combine(datetime.today().date(), end_time)
            overlap = end_datetime - start_datetime
            return int(overlap.total_seconds() / 60)
        except:
            return 0
    
    @staticmethod
    def _calculate_severity(conflicts):
        """Calculate overall severity based on individual conflict severities"""
        if not conflicts:
            return 'none'
        
        severities = [conflict.get('severity', 'low') for conflict in conflicts]
        
        if 'high' in severities:
            return 'high'
        elif 'medium' in severities:
            return 'medium'
        else:
            return 'low'
    
    @staticmethod
    def get_suggested_time_slots(provider_id, date, duration_minutes=60, exclude_schedule_id=None):
        """
        Get suggested alternative time slots for a given provider and date
        
        Args:
            provider_id: ID of the provider
            date: Date for suggestions
            duration_minutes: Desired appointment duration
            exclude_schedule_id: Schedule ID to exclude (for updates)
            
        Returns:
            list: Available time slots
        """
        suggestions = []
        
        try:
            # Get provider's working hours (simplified - could be from provider settings)
            working_start = time(9, 0)  # 9:00 AM
            working_end = time(17, 0)   # 5:00 PM
            slot_duration = 30  # 30-minute slots
            
            # Get all booked slots for this provider on this date
            booked_slots = []
            schedules = Schedule.objects.filter(provider_id=provider_id, date=date)
            if exclude_schedule_id:
                schedules = schedules.exclude(id=exclude_schedule_id)
            
            for schedule in schedules:
                for timeslot in schedule.time_slots.all():
                    booked_slots.append({
                        'start': timeslot.start_time,
                        'end': timeslot.end_time
                    })
            
            # Generate available slots
            current_time = working_start
            while current_time < working_end:
                # Calculate end time for this slot
                current_datetime = datetime.combine(datetime.today().date(), current_time)
                end_datetime = current_datetime + timedelta(minutes=duration_minutes)
                end_time = end_datetime.time()
                
                # Check if this slot conflicts with any booked slot
                is_available = True
                for booked in booked_slots:
                    if current_time < booked['end'] and end_time > booked['start']:
                        is_available = False
                        break
                
                if is_available and end_time <= working_end:
                    suggestions.append({
                        'start_time': current_time.strftime('%H:%M'),
                        'end_time': end_time.strftime('%H:%M'),
                        'duration_minutes': duration_minutes
                    })
                
                # Move to next slot
                current_datetime += timedelta(minutes=slot_duration)
                current_time = current_datetime.time()
            
        except Exception as e:
            print(f"Error generating suggestions: {str(e)}")
        
        return suggestions[:10]  # Return up to 10 suggestions
