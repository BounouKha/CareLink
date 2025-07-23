"""
Weekly Email Service for sending appointment summaries via email
Similar to weekly SMS service but for email notifications using Microsoft Outlook
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q

from account.models import Patient, NotificationLog
from CareLink.models import Provider, TimeSlot, Schedule
from account.services.email_service import EmailService

# Configure logging
email_logger = logging.getLogger('carelink.email')

User = get_user_model()

class WeeklyEmailService:
    """
    Service for sending weekly appointment summaries via email
    """
    
    def __init__(self):
        self.email_service = EmailService()
    
    def send_weekly_notifications(self, week_offset=1):
        """
        Send weekly email notifications to patients and providers
        
        Args:
            week_offset (int): Number of weeks from current week (1 = next week, 0 = current week)
            
        Returns:
            dict: Summary of operation results
        """
        try:
            # Calculate week range
            today = timezone.now().date()
            week_start = today + timedelta(days=(7 * week_offset) - today.weekday())
            week_end = week_start + timedelta(days=6)
            
            email_logger.info(f"=== WEEKLY EMAIL OPERATION STARTED ===")
            email_logger.info(f"Sending weekly email summaries for week {week_start} to {week_end}")
            
            results = {
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'patients': {
                    'total': 0,
                    'sent': 0,
                    'failed': 0,
                    'no_email': 0,
                    'details': []
                },
                'providers': {
                    'total': 0,
                    'sent': 0,
                    'failed': 0,
                    'no_email': 0,
                    'details': []
                }
            }
            
            # Send patient summaries
            patient_results = self._send_patient_summaries(week_start, week_end)
            results['patients'] = patient_results
            
            # Send provider summaries  
            provider_results = self._send_provider_summaries(week_start, week_end)
            results['providers'] = provider_results
            
            email_logger.info(f"=== WEEKLY EMAIL OPERATION COMPLETED ===")
            email_logger.info(f"Patients: {patient_results['sent']}/{patient_results['total']} sent, {patient_results['failed']} failed")
            email_logger.info(f"Providers: {provider_results['sent']}/{provider_results['total']} sent, {provider_results['failed']} failed")
            
            return {
                'success': True,
                'results': results
            }
            
        except Exception as e:
            email_logger.error(f"CRITICAL ERROR in weekly email operation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'results': None
            }
    
    def _send_patient_summaries(self, week_start, week_end):
        """Send weekly summaries to patients"""
        results = {
            'total': 0,
            'sent': 0,
            'failed': 0,
            'no_email': 0,
            'details': []
        }
        
    def _send_patient_summaries(self, week_start, week_end):
        """Send weekly summaries to patients"""
        results = {
            'total': 0,
            'sent': 0,
            'failed': 0,
            'no_email': 0,
            'details': []
        }
        
        try:
            # Get all schedules for the week with patients who have email preferences
            from account.models import UserPreferences
            
            schedules = Schedule.objects.filter(
                date__range=[week_start, week_end],
                patient__isnull=False,
                provider__isnull=False,
                patient__user__is_active=True,  # Only active users
                time_slots__status__in=['confirmed', 'scheduled']  # Only confirmed and scheduled appointments
            ).select_related('patient__user', 'provider__user').prefetch_related('time_slots__service').distinct()
            
            email_logger.info(f"Found {schedules.count()} schedules with confirmed/scheduled appointments")
            
            # Filter out anonymized users
            filtered_schedules = []
            for schedule in schedules:
                user = schedule.patient.user
                # Skip if user is anonymized (firstname is "anonymized") 
                if user.firstname and user.firstname.lower() == "anonymized":
                    email_logger.info(f"  ⏭️ Skipping anonymized patient: {user.email}")
                    continue
                # Only include schedules that have time slots (actual appointments)
                if schedule.time_slots.exists():
                    filtered_schedules.append(schedule)
            
            # Group appointments by patient (like SMS service does)
            patient_appointments = self._group_appointments_by_patient(filtered_schedules)
            
            email_logger.info(f"Processing {len(patient_appointments)} patients for weekly email summaries")
            
            for patient_id, data in patient_appointments.items():
                patient = data['patient']
                appointments = data['appointments']  # This is now a list of appointment dictionaries
                results['total'] += 1
                patient_name = f"{patient.user.firstname} {patient.user.lastname}"
                
                try:
                    email_logger.info(f"Processing patient: {patient_name} ({patient.user.email})")
                    
                    # Check user preferences - only send if they prefer email
                    try:
                        preferences, _ = UserPreferences.objects.get_or_create(user=patient.user)
                        
                        if not (preferences.email_notifications and 
                                preferences.preferred_contact_method in ['email']):
                            email_logger.info(f"  - SKIPPED: User prefers '{preferences.preferred_contact_method}' notifications")
                            continue
                            
                    except Exception as e:
                        email_logger.warning(f"Error checking preferences for patient {patient.user.email}: {str(e)}")
                        continue
                    
                    # Check if patient has email
                    if not patient.user.email or not patient.user.email.strip():
                        email_logger.warning(f"  - SKIPPED: No email address found for {patient_name}")
                        results['no_email'] += 1
                        
                        # Log the no-email failure
                        message = f"Weekly email for {patient_name} - FAILED: No email address found"
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=patient.user.username or f"patient_{patient.id}",
                            subject="Weekly Appointments Summary",
                            message=message,
                            status='failed',
                            error_message="No email address found",
                            external_id=f"NO-EMAIL-{timezone.now().strftime('%Y%m%d-%H%M%S')}-P{patient.id}",
                            metadata={'notification_type': 'weekly_summary'}
                        )
                        continue
                    
                    # Count total appointments
                    total_appointments = len(appointments)
                    email_logger.info(f"  - Found {total_appointments} appointments")
                    
                    # Convert appointments to schedule-like structure for email service
                    schedules_data = self._convert_appointments_to_schedules(appointments)
                    
                    # Send weekly summary using email service
                    result = self.email_service.send_weekly_summary(
                        patient=patient,
                        schedules=schedules_data,
                        week_start=week_start,
                        week_end=week_end
                    )
                    
                    if result['success']:
                        results['sent'] += 1
                        email_logger.info(f"  ✅ Weekly email sent to {patient_name}")
                        
                        # Log successful notification with proper external_id
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=patient.user.email,
                            subject=f"Weekly Appointments Summary - {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}",
                            message=f"Weekly summary with {total_appointments} appointment(s)",
                            status='sent',
                            external_id=f"EMAIL-WEEKLY-{timezone.now().strftime('%Y%m%d-%H%M%S')}-P{patient.id}",
                            metadata={'notification_type': 'weekly_summary'}
                        )
                    else:
                        results['failed'] += 1
                        error_message = result.get('error', 'Unknown error')
                        
                        # Enhanced error logging with explanations
                        explanation = self._get_email_error_explanation(error_message)
                        email_logger.error(f"  ❌ Failed to send weekly email to {patient_name}")
                        email_logger.error(f"     📧 Email: {patient.user.email}")
                        email_logger.error(f"     🔍 Error: {error_message}")
                        email_logger.error(f"     💡 Explanation: {explanation}")
                        
                        # Log failed notification with proper external_id and explanation
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=patient.user.email,
                            subject=f"Weekly Appointments Summary - {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}",
                            message=f"Weekly summary with {total_appointments} appointment(s)",
                            status='failed',
                            error_message=f"{error_message} | {explanation}",
                            external_id=f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-P{patient.id}",
                            metadata={'notification_type': 'weekly_summary', 'error_explanation': explanation}
                        )
                    
                    results['details'].append({
                        'name': patient_name,
                        'email': patient.user.email,
                        'appointments_count': total_appointments,
                        'success': result['success'],
                        'error': result.get('error')
                    })
                    
                except Exception as e:
                    results['failed'] += 1
                    email_logger.error(f"  ❌ ERROR processing patient {patient_name}: {str(e)}")
            
            return results
            
        except Exception as e:
            email_logger.error(f"Error in patient email summaries: {str(e)}")
            return results
    
    def _send_provider_summaries(self, week_start, week_end):
        """Send weekly summaries to providers"""
        results = {
            'total': 0,
            'sent': 0,
            'failed': 0,
            'no_email': 0,
            'details': []
        }
        
        try:
            # Get all schedules for the week with providers who have email preferences
            from account.models import UserPreferences
            
            schedules = Schedule.objects.filter(
                date__range=[week_start, week_end],
                patient__isnull=False,
                provider__isnull=False,
                provider__user__is_active=True,  # Only active providers
                time_slots__status__in=['confirmed', 'scheduled']  # Only confirmed and scheduled appointments
            ).select_related('patient__user', 'provider__user').prefetch_related('time_slots__service').distinct()
            
            # Filter out anonymized providers
            filtered_schedules = []
            for schedule in schedules:
                user = schedule.provider.user
                # Skip if user is anonymized (firstname is "anonymized")
                if user.firstname and user.firstname.lower() == "anonymized":
                    email_logger.info(f"  ⏭️ Skipping anonymized provider: {user.email}")
                    continue
                # Only include schedules that have time slots (actual appointments)
                if schedule.time_slots.exists():
                    filtered_schedules.append(schedule)
            
            # Group appointments by provider (like SMS service does)
            provider_appointments = self._group_appointments_by_provider(filtered_schedules)
            
            email_logger.info(f"Processing {len(provider_appointments)} providers for weekly email summaries")
            
            for provider_id, data in provider_appointments.items():
                provider = data['provider']
                appointments = data['appointments']  # This is now a list of appointment dictionaries
                results['total'] += 1
                provider_name = f"{provider.user.firstname} {provider.user.lastname}"
                
                try:
                    email_logger.info(f"Processing provider: {provider_name} ({provider.user.email})")
                    
                    # Check user preferences - only send if they prefer email
                    try:
                        preferences, _ = UserPreferences.objects.get_or_create(user=provider.user)
                        
                        if not (preferences.email_notifications and 
                                preferences.preferred_contact_method in ['email']):
                            email_logger.info(f"  - SKIPPED: User prefers '{preferences.preferred_contact_method}' notifications")
                            continue
                            
                    except Exception as e:
                        email_logger.warning(f"Error checking preferences for provider {provider.user.email}: {str(e)}")
                        continue
                    
                    # Check if provider has email
                    if not provider.user.email or not provider.user.email.strip():
                        email_logger.warning(f"  - SKIPPED: No email address found for {provider_name}")
                        results['no_email'] += 1
                        
                        # Log the no-email failure
                        message = f"Weekly email for {provider_name} - FAILED: No email address found"
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=provider.user.username or f"provider_{provider.id}",
                            subject="Weekly Schedule Summary",
                            message=message,
                            status='failed',
                            error_message="No email address found",
                            external_id=f"NO-EMAIL-{timezone.now().strftime('%Y%m%d-%H%M%S')}-R{provider.id}",
                            metadata={'notification_type': 'weekly_summary'}
                        )
                        continue
                    
                    # Count total appointments
                    total_appointments = len(appointments)
                    email_logger.info(f"  - Found {total_appointments} appointments")
                    
                    # Convert appointments to schedule-like structure for email content
                    schedules_data = self._convert_appointments_to_schedules(appointments)
                    
                    # Create provider-specific context
                    subject = f"Weekly Schedule Summary - {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}"
                    message = self._generate_provider_email_content(provider, schedules_data, week_start, week_end)                    # Send email
                    result = self.email_service.send_email(
                        to_email=provider.user.email,
                        subject=subject,
                        message=message,
                        sender_info={'type': 'weekly_summary', 'provider_id': provider.id}
                    )
                    
                    if result['success']:
                        results['sent'] += 1
                        email_logger.info(f"  ✅ Weekly email sent to {provider_name}")
                        
                        # Log successful notification
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=provider.user.email,
                            subject=subject,
                            message=f"Weekly schedule with {total_appointments} appointment(s)",
                            status='sent',
                            external_id=f"EMAIL-WEEKLY-{timezone.now().strftime('%Y%m%d-%H%M%S')}-R{provider.id}",
                            metadata={'notification_type': 'weekly_summary'}
                        )
                    else:
                        results['failed'] += 1
                        error_message = result.get('error', 'Unknown error')
                        
                        # Enhanced error logging with explanations
                        explanation = self._get_email_error_explanation(error_message)
                        email_logger.error(f"  ❌ Failed to send weekly email to {provider_name}")
                        email_logger.error(f"     📧 Email: {provider.user.email}")
                        email_logger.error(f"     🔍 Error: {error_message}")
                        email_logger.error(f"     💡 Explanation: {explanation}")
                        
                        # Log failed notification with explanation
                        NotificationLog.objects.create(
                            notification_type='email',
                            recipient=provider.user.email,
                            subject=subject,
                            message=f"Weekly schedule with {total_appointments} appointment(s)",
                            status='failed',
                            error_message=f"{error_message} | {explanation}",
                            external_id=f"FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-R{provider.id}",
                            metadata={'notification_type': 'weekly_summary', 'error_explanation': explanation}
                        )
                    
                    results['details'].append({
                        'name': provider_name,
                        'email': provider.user.email,
                        'appointments_count': total_appointments,
                        'success': result['success'],
                        'error': result.get('error')
                    })
                    
                except Exception as e:
                    results['failed'] += 1
                    email_logger.error(f"  ❌ ERROR processing provider {provider_name}: {str(e)}")
            
            return results
            
        except Exception as e:
            email_logger.error(f"Error in provider email summaries: {str(e)}")
            return results
    
    def _generate_provider_email_content(self, provider, schedules, week_start, week_end):
        """Generate email content for providers - schedules is list of schedule data"""
        content = f"""
Dear {provider.user.firstname},

Here's your weekly schedule summary for {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}:

"""
        
        total_appointments = sum(len(schedule_data.get('appointments', [])) for schedule_data in schedules)
        
        if schedules and total_appointments > 0:
            content += f"You have {total_appointments} appointment{'s' if total_appointments != 1 else ''} scheduled:\n\n"
            
            # Sort schedules by date (schedules is a list of dictionaries)
            sorted_schedules = sorted(schedules, key=lambda s: s.get('appointments', [{}])[0].get('date', ''))
            
            for schedule_data in sorted_schedules:
                appointments = schedule_data.get('appointments', [])
                if appointments:
                    # All appointments in this schedule_data have the same date
                    schedule_date = appointments[0]['date']
                    content += f"📅 {schedule_date.strftime('%A, %B %d')}\n"
                    
                    # Sort appointments by start time
                    sorted_appointments = sorted(appointments, key=lambda a: a.get('start_time', ''))
                    
                    for appointment in sorted_appointments:
                        content += f"  • {appointment['start_time'].strftime('%I:%M %p')} - {appointment['end_time'].strftime('%I:%M %p')}\n"
                        content += f"    Patient: {appointment['patient_name']}\n"
                        content += f"    Service: {appointment['service_name']}\n"
                        if appointment.get('description'):
                            content += f"    Notes: {appointment['description']}\n"
                        content += "\n"
        else:
            content += "✅ No appointments scheduled for this week.\n\n"
        
        content += """
Please review your schedule and prepare accordingly.

Best regards,
CareLink Team

---
This is an automated message from CareLink Care Management System.
"""
        
        return content

    def _group_appointments_by_patient(self, schedules):
        """Group appointments by patient (like SMS service)"""
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
                patient_appointments[patient_id]['appointments'].append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'provider_name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider else 'Provider TBD',
                    'patient_name': f"{patient.user.firstname} {patient.user.lastname}",
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'description': timeslot.description,
                    'status': timeslot.status
                })
        
        return patient_appointments
    
    def _group_appointments_by_provider(self, schedules):
        """Group appointments by provider (like SMS service)"""
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
                provider_appointments[provider_id]['appointments'].append({
                    'date': schedule.date,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'provider_name': f"{provider.user.firstname} {provider.user.lastname}",
                    'patient_name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient else 'Blocked Time',
                    'service_name': timeslot.service.name if timeslot.service else 'General Care',
                    'description': timeslot.description,
                    'status': timeslot.status
                })
        
        return provider_appointments
    
    def _convert_appointments_to_schedules(self, appointments):
        """Convert appointment list to schedule-like structure grouped by date for email templates"""
        schedules_data = []
        
        # Group appointments by date
        appointments_by_date = {}
        for appointment in appointments:
            date_key = appointment['date']
            if date_key not in appointments_by_date:
                appointments_by_date[date_key] = []
            appointments_by_date[date_key].append(appointment)
        
        # Convert to schedule-like structure
        for date, date_appointments in sorted(appointments_by_date.items()):
            schedules_data.append({
                'date': date,
                'appointments': sorted(date_appointments, key=lambda a: a['start_time'])
            })
        
        return schedules_data
    
    def _get_email_error_explanation(self, error_message):
        """Get user-friendly explanation for email errors"""
        error_lower = error_message.lower()
        
        if 'rfc 2606' in error_lower or 'example.com' in error_lower or 'example.org' in error_lower:
            return "This is an RFC 2606 reserved test domain that doesn't accept real emails. Test addresses like @example.com, @example.org are for documentation purposes only and will always fail in production."
        elif 'authentication' in error_lower or 'login' in error_lower or 'credential' in error_lower:
            return "SMTP authentication failed. Check email server credentials, username, password, or app-specific password configuration."
        elif 'invalid' in error_lower and 'address' in error_lower:
            return "The email address format is invalid or malformed. Please verify the recipient's email address is correctly formatted."
        elif 'network' in error_lower or 'timeout' in error_lower or 'connection' in error_lower:
            return "Network connectivity issue or email server timeout. This may be temporary - check internet connection and email server status."
        elif 'blocked' in error_lower or 'spam' in error_lower or 'rejected' in error_lower:
            return "Email was blocked or rejected by the recipient's server. This could be due to spam filters or server policies."
        elif 'quota' in error_lower or 'mailbox full' in error_lower:
            return "Recipient's mailbox is full or over quota. The recipient needs to clear space in their email account."
        else:
            return "Unknown email delivery error. Check email server configuration, recipient address validity, and network connectivity."

# Create global weekly email service instance
weekly_email_service = WeeklyEmailService()
