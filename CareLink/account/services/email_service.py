from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """
    Service class for handling email notifications with logging and tracking
    """
    
    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@carelink.com')
        self.from_name = getattr(settings, 'EMAIL_FROM_NAME', 'CareLink Support')
    
    def send_email(self, to_email, subject, message, from_name=None, sender_info=None, template_name=None, context=None):
        """
        Send an email with logging and tracking
        
        Args:
            to_email (str): Recipient email address
            subject (str): Email subject
            message (str): Email message (plain text or HTML)
            from_name (str, optional): Sender name
            sender_info (dict, optional): Information about who triggered the email
            template_name (str, optional): Django template name for HTML emails
            context (dict, optional): Template context variables
            
        Returns:
            dict: Result with success status and details
        """
        from account.models import NotificationLog
        
        try:
            # Create notification log entry
            log_entry = NotificationLog.objects.create(
                notification_type='email',
                recipient=to_email,
                subject=subject,
                message=message[:1000],  # Truncate for storage
                status='pending',
                external_id=f"EMAIL-PENDING-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{hash(to_email) % 10000}",
                sent_by_id=sender_info.get('user_id') if sender_info else None,
                metadata=sender_info or {}
            )
            
            # Prepare email content
            if template_name and context:
                # Use HTML template
                html_message = render_to_string(template_name, context)
                
                # Create email message
                email = EmailMessage(
                    subject=subject,
                    body=html_message,
                    from_email=f"{from_name or self.from_name} <{self.from_email}>",
                    to=[to_email],
                )
                email.content_subtype = 'html'  # Main content is now HTML
                
                # Send email
                result = email.send()
            else:
                # Send plain text email
                result = send_mail(
                    subject=subject,
                    message=message,
                    from_email=f"{from_name or self.from_name} <{self.from_email}>",
                    recipient_list=[to_email],
                    fail_silently=False,
                )
            
            if result:
                # Mark as sent and update external_id
                log_entry.external_id = f"EMAIL-SENT-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{log_entry.id}"
                log_entry.mark_as_sent()
                logger.info(f"Email sent successfully to {to_email}: {subject}")
                
                return {
                    'success': True,
                    'log_id': log_entry.id,
                    'message': 'Email sent successfully'
                }
            else:
                # Mark as failed and update external_id
                log_entry.external_id = f"EMAIL-FAILED-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{log_entry.id}"
                log_entry.mark_as_failed('Failed to send email - no result returned')
                logger.error(f"Failed to send email to {to_email}: {subject}")
                
                return {
                    'success': False,
                    'error': 'Failed to send email',
                    'log_id': log_entry.id
                }
                
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error sending email to {to_email}: {error_message}")
            
            # Update log entry with error and external_id
            if 'log_entry' in locals():
                log_entry.external_id = f"EMAIL-ERROR-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{log_entry.id}"
                log_entry.mark_as_failed(error_message)
                
            return {
                'success': False,
                'error': error_message,
                'log_id': log_entry.id if 'log_entry' in locals() else None
            }
    
    def send_appointment_reminder(self, patient, appointment, reminder_type='day_before'):
        """
        Send appointment reminder email
        """
        subject = f"Appointment Reminder - {appointment.start_time.strftime('%B %d, %Y')}"
        
        context = {
            'patient': patient,
            'appointment': appointment,
            'reminder_type': reminder_type,
            'site_name': 'CareLink'
        }
        
        return self.send_email(
            to_email=patient.email,
            subject=subject,
            message=self._generate_appointment_reminder_text(context),
            template_name='emails/appointment_reminder.html',
            context=context,
            sender_info={'type': 'appointment_reminder', 'appointment_id': appointment.id}
        )
    
    def send_weekly_summary(self, patient, schedules, week_start, week_end):
        """
        Send weekly appointments summary email
        """
        subject = f"Weekly Appointments Summary - {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}"
        
        context = {
            'patient': patient,
            'schedules': schedules,
            'week_start': week_start,
            'week_end': week_end,
            'site_name': 'CareLink'
        }
        
        return self.send_email(
            to_email=patient.user.email,
            subject=subject,
            message=self._generate_weekly_summary_text(context),
            template_name='emails/weekly_summary.html',
            context=context,
            sender_info={'type': 'weekly_summary', 'patient_id': patient.id}
        )
    
    def send_service_demand_notification(self, patient, service_demand, comment=None):
        """
        Send service demand notification email
        """
        if comment:
            subject = f"New Comment on Your Service Request #{service_demand.id}"
        else:
            subject = f"Service Request Update #{service_demand.id}"
        
        context = {
            'patient': patient,
            'service_demand': service_demand,
            'comment': comment,
            'site_name': 'CareLink'
        }
        
        return self.send_email(
            to_email=patient.email,
            subject=subject,
            message=self._generate_service_demand_text(context),
            template_name='emails/service_demand_notification.html',
            context=context,
            sender_info={'type': 'service_demand', 'service_demand_id': service_demand.id}
        )
    
    def _generate_appointment_reminder_text(self, context):
        """Generate plain text version of appointment reminder"""
        appointment = context['appointment']
        patient = context['patient']
        
        return f"""
Dear {patient.user.firstname},

This is a reminder of your upcoming appointment:

Date & Time: {appointment.start_time.strftime('%B %d, %Y at %I:%M %p')}
Duration: {appointment.duration_display}
Service: {appointment.service_demand.service_type if appointment.service_demand else 'Healthcare Service'}

Please arrive 15 minutes early for check-in.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
CareLink Team
"""
    
    def _generate_weekly_summary_text(self, context):
        """Generate plain text version of weekly summary"""
        patient = context['patient']
        schedules = context['schedules']  # This is now a list of schedule data, not QuerySet
        week_start = context['week_start']
        week_end = context['week_end']
        
        text = f"""
Dear {patient.user.firstname},

Here's your weekly appointments summary for {week_start.strftime('%B %d')} to {week_end.strftime('%B %d, %Y')}:

"""
        
        total_appointments = 0
        # schedules is now a list of schedule data dictionaries
        for schedule_data in schedules:
            appointments = schedule_data.get('appointments', [])
            if appointments:
                schedule_date = appointments[0]['date']  # All appointments in this schedule have same date
                text += f"\n📅 {schedule_date.strftime('%A, %B %d')}:\n"
                
                for appointment in appointments:
                    total_appointments += 1
                    text += f"  • {appointment['start_time'].strftime('%I:%M %p')} - {appointment['end_time'].strftime('%I:%M %p')}\n"
                    text += f"    Service: {appointment['service_name']}\n"
                    text += f"    Provider: {appointment['provider_name']}\n"
                    if appointment.get('description'):
                        text += f"    Notes: {appointment['description']}\n"
                    text += "\n"
        
        if total_appointments == 0:
            text += "✅ No appointments scheduled for this week.\n\n"
        else:
            text += f"Total appointments: {total_appointments}\n\n"
            text += "Please make sure to arrive 15 minutes early for each appointment.\n\n"
        
        text += """Best regards,
CareLink Team
"""
        return text
    
    def _generate_service_demand_text(self, context):
        """Generate plain text version of service demand notification"""
        patient = context['patient']
        service_demand = context['service_demand']
        comment = context.get('comment')
        
        if comment:
            return f"""
Dear {patient.user.firstname},

A new comment has been added to your service request #{service_demand.id}:

"{comment.comment}"

You can view the full details and respond by logging into your CareLink account.

Best regards,
CareLink Team
"""
        else:
            return f"""
Dear {patient.user.firstname},

Your service request #{service_demand.id} has been updated.

Status: {service_demand.get_status_display()}

You can view the full details by logging into your CareLink account.

Best regards,
CareLink Team
"""
