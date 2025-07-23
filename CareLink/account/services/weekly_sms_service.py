import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from CareLink.models import Schedule, Patient, Provider, PhoneUser
from account.models import UserPreferences, NotificationLog
from .sms_service import sms_service

# Configure detailed logging for SMS operations
logger = logging.getLogger(__name__)
sms_logger = logging.getLogger('sms_operations')

class WeeklySMSService:
    """
    Service for sending weekly appointment summaries via SMS
    """
    
    def __init__(self):
        self.sms_service = sms_service
    
    def send_weekly_notifications(self, week_offset=1):
        """
        Send weekly SMS notifications to patients and providers
        
        Args:
            week_offset (int): Week offset (1 = next week, 0 = current week)
            
        Returns:
            dict: Results summary with detailed logging
        """
        try:
            # Calculate week dates
            today = timezone.now().date()
            days_since_sunday = today.weekday() + 1 if today.weekday() != 6 else 0
            week_start = today - timedelta(days=days_since_sunday) + timedelta(weeks=week_offset)
            week_end = week_start + timedelta(days=6)
            
            sms_logger.info(f"=== WEEKLY SMS OPERATION STARTED ===")
            sms_logger.info(f"Week range: {week_start} to {week_end}")
            sms_logger.info(f"Week offset: {week_offset} ({'next week' if week_offset == 1 else 'current week' if week_offset == 0 else f'{week_offset} weeks'})")
            
            # Get all schedules for the week - filter out inactive and anonymized users
            # Only include schedules with confirmed or scheduled timeslots
            schedules = Schedule.objects.filter(
                date__range=[week_start, week_end],
                patient__isnull=False,
                provider__isnull=False,
                patient__user__is_active=True,
                provider__user__is_active=True,
                time_slots__status__in=['confirmed', 'scheduled']  # Only confirmed and scheduled appointments
            ).select_related('patient__user', 'provider__user').prefetch_related('time_slots__service').distinct()
            
            sms_logger.info(f"Found {schedules.count()} schedules with confirmed/scheduled appointments")
            
            # Filter out anonymized users
            filtered_schedules = []
            for schedule in schedules:
                # Check patient
                if (schedule.patient.user.firstname and 
                    schedule.patient.user.firstname.lower() == "anonymized"):
                    sms_logger.info(f"  ⏭️ Skipping anonymized patient: {schedule.patient.user.email}")
                    continue
                
                # Check provider
                if (schedule.provider.user.firstname and 
                    schedule.provider.user.firstname.lower() == "anonymized"):
                    sms_logger.info(f"  ⏭️ Skipping anonymized provider: {schedule.provider.user.email}")
                    continue
                
                # Only include schedules that have time slots (actual appointments)
                if schedule.time_slots.exists():
                    filtered_schedules.append(schedule)
            
            sms_logger.info(f"Found {len(filtered_schedules)} valid schedules after filtering")
            
            # Group appointments by patient and provider
            patient_appointments = self._group_appointments_by_patient(filtered_schedules)
            provider_appointments = self._group_appointments_by_provider(filtered_schedules)
            
            sms_logger.info(f"Grouped into {len(patient_appointments)} patients and {len(provider_appointments)} providers")
            
            # Send SMS to patients
            sms_logger.info("--- STARTING PATIENT SMS ---")
            patient_results = self._send_patient_sms(patient_appointments, week_start, week_end)
            
            # Send SMS to providers  
            sms_logger.info("--- STARTING PROVIDER SMS ---")
            provider_results = self._send_provider_sms(provider_appointments, week_start, week_end)
            
            # Combine results
            total_sent = patient_results['sent'] + provider_results['sent']
            total_failed = patient_results['failed'] + provider_results['failed']
            total_skipped = patient_results['skipped'] + provider_results['skipped']
            
            sms_logger.info(f"=== WEEKLY SMS OPERATION COMPLETED ===")
            sms_logger.info(f"TOTAL SUMMARY: {total_sent} sent, {total_failed} failed, {total_skipped} skipped")
            
            return {
                'success': True,
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'patients': patient_results,
                'providers': provider_results,
                'total_sent': total_sent,
                'total_failed': total_failed,
                'total_skipped': total_skipped
            }
            
        except Exception as e:
            sms_logger.error(f"CRITICAL ERROR in weekly SMS operation: {str(e)}")
            logger.error(f"Error sending weekly SMS notifications: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _group_appointments_by_patient(self, schedules):
        """Group appointments by patient"""
        patient_appointments = {}
        
        for schedule in schedules:
            patient = schedule.patient
            patient_id = patient.id
            
            if patient_id not in patient_appointments:
                patient_appointments[patient_id] = {
                    'patient': patient,
                    'appointments': []
                }
            
            # Add each timeslot as appointment (only confirmed and scheduled)
            for timeslot in schedule.time_slots.filter(status__in=['confirmed', 'scheduled']):
                start_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.start_time)
                )
                end_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.end_time)
                )
                
                patient_appointments[patient_id]['appointments'].append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'provider_name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider.user else 'TBD',
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'status': timeslot.status
                })
        
        return patient_appointments
    
    def _group_appointments_by_provider(self, schedules):
        """Group appointments by provider"""
        provider_appointments = {}
        
        for schedule in schedules:
            provider = schedule.provider
            provider_id = provider.id
            
            if provider_id not in provider_appointments:
                provider_appointments[provider_id] = {
                    'provider': provider,
                    'appointments': []
                }
            
            # Add each timeslot as appointment (only confirmed and scheduled)
            for timeslot in schedule.time_slots.filter(status__in=['confirmed', 'scheduled']):
                start_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.start_time)
                )
                end_datetime = timezone.make_aware(
                    datetime.combine(schedule.date, timeslot.end_time)
                )
                
                provider_appointments[provider_id]['appointments'].append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'patient_name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient.user else 'Unknown',
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'status': timeslot.status
                })
        
        return provider_appointments
    
    def _send_patient_sms(self, patient_appointments, week_start, week_end):
        """Send SMS to patients with SMS preference"""
        sent = 0
        failed = 0
        skipped = 0
        
        sms_logger.info(f"Processing {len(patient_appointments)} patients for SMS")
        
        for patient_id, data in patient_appointments.items():
            patient = data['patient']
            appointments = data['appointments']
            patient_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else 'Unknown'
            
            try:
                sms_logger.info(f"Processing patient: {patient_name} (ID: {patient_id})")
                sms_logger.info(f"  - Has {len(appointments)} appointments")
                
                # Check if patient has SMS preference
                user_prefs = getattr(patient.user, 'preferences', None)
                if not user_prefs or user_prefs.preferred_contact_method != 'sms':
                    skipped += 1
                    preference = user_prefs.preferred_contact_method if user_prefs else 'none'
                    sms_logger.info(f"  - SKIPPED: Preference is '{preference}', not SMS")
                    continue
                
                sms_logger.info(f"  - Has SMS preference ✓")
                
                # Get patient's phone number
                phone_number = self._get_user_phone_number(patient.user)
                if not phone_number:
                    failed += 1
                    sms_logger.warning(f"  - FAILED: No phone number found")
                    # Log failed notification for missing phone number
                    message = f"Weekly SMS for {patient_name} - FAILED: No phone number found"
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=patient.user.email,
                        message=message,
                        status='failed',
                        external_id=f"NO-PHONE-{timezone.now().strftime('%Y%m%d-%H%M%S')}-P{patient.id}",
                        error_message="No phone number found",
                        metadata={'notification_type': 'weekly_summary'}
                    )
                    continue
                
                sms_logger.info(f"  - Phone number: {phone_number} ✓")
                
                # Generate SMS message
                message = self._generate_patient_sms(patient, appointments, week_start, week_end)
                sms_logger.info(f"  - Generated message ({len(message)} chars)")
                
                # Send SMS
                sms_logger.info(f"  - Sending SMS...")
                result = self.sms_service.send_sms(phone_number, message)
                
                if result['status'] == 'sent':
                    sent += 1
                    sms_logger.info(f"  - SUCCESS: SMS sent (ID: {result.get('external_id')})")
                    # Log successful notification
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=patient.user.email,
                        message=message,
                        status='sent',
                        external_id=result.get('external_id'),
                        metadata={'notification_type': 'weekly_summary'}
                    )
                else:
                    failed += 1
                    sms_logger.error(f"  - FAILED: {result.get('error_message')}")
                    # Log failed notification
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=patient.user.email,
                        message=message,
                        status='failed',
                        error_message=result.get('error_message'),
                        external_id=f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-P{patient.id}",
                        metadata={'notification_type': 'weekly_summary'}
                    )
                    
            except Exception as e:
                failed += 1
                sms_logger.error(f"  - ERROR processing patient {patient_name}: {str(e)}")
        
        sms_logger.info(f"Patient SMS summary: {sent} sent, {failed} failed, {skipped} skipped")
        return {'sent': sent, 'failed': failed, 'skipped': skipped}
    
    def _send_provider_sms(self, provider_appointments, week_start, week_end):
        """Send SMS to providers with SMS preference"""
        sent = 0
        failed = 0
        skipped = 0
        
        sms_logger.info(f"Processing {len(provider_appointments)} providers for SMS")
        
        for provider_id, data in provider_appointments.items():
            provider = data['provider']
            appointments = data['appointments']
            provider_name = f"{provider.user.firstname} {provider.user.lastname}" if provider.user else 'Unknown'
            
            try:
                sms_logger.info(f"Processing provider: {provider_name} (ID: {provider_id})")
                sms_logger.info(f"  - Has {len(appointments)} appointments")
                
                # Check if provider has SMS preference
                user_prefs = getattr(provider.user, 'preferences', None)
                if not user_prefs or user_prefs.preferred_contact_method != 'sms':
                    skipped += 1
                    preference = user_prefs.preferred_contact_method if user_prefs else 'none'
                    sms_logger.info(f"  - SKIPPED: Preference is '{preference}', not SMS")
                    continue
                
                sms_logger.info(f"  - Has SMS preference ✓")
                
                # Get provider's phone number
                phone_number = self._get_user_phone_number(provider.user)
                if not phone_number:
                    failed += 1
                    sms_logger.warning(f"  - FAILED: No phone number found")
                    # Log failed notification for missing phone number
                    message = f"Weekly SMS for {provider_name} - FAILED: No phone number found"
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=provider.user.email,
                        message=message,
                        status='failed',
                        external_id=f"NO-PHONE-{timezone.now().strftime('%Y%m%d-%H%M%S')}-R{provider.id}",
                        error_message="No phone number found",
                        metadata={'notification_type': 'weekly_summary'}
                    )
                    continue
                
                sms_logger.info(f"  - Phone number: {phone_number} ✓")
                
                # Generate SMS message
                message = self._generate_provider_sms(provider, appointments, week_start, week_end)
                sms_logger.info(f"  - Generated message ({len(message)} chars)")
                
                # Send SMS
                sms_logger.info(f"  - Sending SMS...")
                result = self.sms_service.send_sms(phone_number, message)
                
                if result['status'] == 'sent':
                    sent += 1
                    sms_logger.info(f"  - SUCCESS: SMS sent (ID: {result.get('external_id')})")
                    # Log successful notification
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=provider.user.email,
                        message=message,
                        status='sent',
                        external_id=result.get('external_id'),
                        metadata={'notification_type': 'weekly_summary'}
                    )
                else:
                    failed += 1
                    sms_logger.error(f"  - FAILED: {result.get('error_message')}")
                    # Log failed notification
                    NotificationLog.objects.create(
                        notification_type='sms',
                        recipient=provider.user.email,
                        message=message,
                        status='failed',
                        error_message=result.get('error_message'),
                        external_id=f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-R{provider.id}",
                        metadata={'notification_type': 'weekly_summary'}
                    )
                    
            except Exception as e:
                failed += 1
                sms_logger.error(f"  - ERROR processing provider {provider_name}: {str(e)}")
        
        sms_logger.info(f"Provider SMS summary: {sent} sent, {failed} failed, {skipped} skipped")
        return {'sent': sent, 'failed': failed, 'skipped': skipped}
    
    def _get_user_phone_number(self, user):
        """Get user's phone number from PhoneUser model"""
        try:
            # Get user's primary phone or first available phone
            phone_user = PhoneUser.objects.filter(user=user).first()
            return phone_user.phone_number if phone_user else None
        except Exception as e:
            logger.error(f"Error getting phone number for user {user.id}: {str(e)}")
            return None
    
    def _generate_patient_sms(self, patient, appointments, week_start, week_end):
        """Generate SMS message for patient"""
        patient_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else 'Patient'
        
        message = f"Hello {patient.user.firstname},\n"
        message += f"Your appointments for {week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}:\n\n"
        
        # Sort appointments by date and time
        sorted_appointments = sorted(appointments, key=lambda x: (x['date'], x['start_time']))
        
        for apt in sorted_appointments:
            day_name = apt['date'].strftime('%A')
            date_str = apt['date'].strftime('%d/%m')
            start_time = apt['start_time'].strftime('%H:%M')
            end_time = apt['end_time'].strftime('%H:%M')
            message += f"• {day_name} {date_str} {start_time}-{end_time} - {apt['provider_name']} ({apt['service_name']})\n"
        
        message += "\nCareLink Team"
        
        return message
    
    def _generate_provider_sms(self, provider, appointments, week_start, week_end):
        """Generate SMS message for provider"""
        provider_name = f"{provider.user.firstname} {provider.user.lastname}" if provider.user else 'Provider'
        
        message = f"Hello {provider.user.firstname},\n"
        message += f"Your appointments for {week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}:\n\n"
        
        # Sort appointments by date and time
        sorted_appointments = sorted(appointments, key=lambda x: (x['date'], x['start_time']))
        
        for apt in sorted_appointments:
            day_name = apt['date'].strftime('%A')
            date_str = apt['date'].strftime('%d/%m')
            start_time = apt['start_time'].strftime('%H:%M')
            end_time = apt['end_time'].strftime('%H:%M')
            message += f"• {day_name} {date_str} {start_time}-{end_time} - {apt['patient_name']} ({apt['service_name']})\n"
        
        message += "\nCareLink Team"
        
        return message

# Create singleton instance
weekly_sms_service = WeeklySMSService()
