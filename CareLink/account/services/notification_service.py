from django.utils import timezone
from CareLink.models import Notification, User, NotificationPreference
import logging

logger = logging.getLogger(__name__)
sms_logger = logging.getLogger('sms_operations')  # Same logger as SMS operations


class NotificationService:
    """Service class to handle notification creation and management"""
    
    @staticmethod
    def create_notification(
        recipient, 
        notification_type, 
        title, 
        message, 
        sender=None, 
        priority='normal',
        schedule=None,
        ticket=None,
        service_demand=None,
        extra_data=None
    ):
        """
        Create a new notification
        
        Args:
            recipient: User who will receive the notification
            notification_type: Type of notification (from NOTIFICATION_TYPES)
            title: Short title for the notification
            message: Detailed message
            sender: User who triggered the notification (optional)
            priority: Priority level (low, normal, high, urgent)
            schedule: Related schedule object (optional)
            ticket: Related ticket object (optional)
            service_demand: Related service demand object (optional)
            extra_data: Additional data as dict (optional)
        
        Returns:
            Notification object
        """
        try:
            # Check if user wants to receive this type of notification
            if not NotificationService._should_send_notification(recipient, notification_type):
                logger.info(f"Notification skipped due to user preferences: {recipient.email} - {notification_type}")
                return None
            
            notification = Notification.objects.create(
                recipient=recipient,
                sender=sender,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                schedule=schedule,
                ticket=ticket,
                service_demand=service_demand,
                extra_data=extra_data or {}
            )
            
            logger.info(f"Notification created: {notification_type} for {recipient.email}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return None

    @staticmethod
    def send_appointment_deletion_notifications(schedule, deleted_by, reason=None):
        """
        Send notifications (in-app, email, SMS) when an appointment is deleted
        
        Args:
            schedule: The deleted schedule object
            deleted_by: User who deleted the appointment
            reason: Optional reason for deletion
        """
        try:
            patient_user = schedule.patient.user if schedule.patient else None
            provider_user = schedule.provider.user if schedule.provider else None
            
            # Get appointment details
            appointment_date = schedule.date.strftime('%B %d, %Y') if schedule.date else 'Unknown date'
            appointment_time = ""
            first_timeslot = schedule.time_slots.first()
            if first_timeslot and first_timeslot.start_time:
                appointment_time = f" at {first_timeslot.start_time.strftime('%H:%M')}"
            
            # 1. CREATE IN-APP NOTIFICATIONS FIRST
            # In-app notification for patient
            if patient_user and patient_user != deleted_by:
                NotificationService.create_notification(
                    recipient=patient_user,
                    sender=deleted_by,
                    notification_type='schedule_cancelled',
                    title='Appointment Cancelled',
                    message=f'Your appointment on {appointment_date}{appointment_time} has been cancelled' + (f'. Reason: {reason}' if reason else '') + '.',
                    priority='high',
                    schedule=schedule,
                    extra_data={
                        'appointment_date': str(schedule.date),
                        'appointment_time': appointment_time,
                        'reason': reason or 'No reason provided',
                        'deleted_by': deleted_by.get_full_name() if deleted_by else 'System'
                    }
                )
                logger.info(f"✅ In-app notification created for patient: {patient_user.get_full_name()}")
            
            # In-app notification for provider
            if provider_user and provider_user != deleted_by:
                patient_name = patient_user.get_full_name() if patient_user else 'a patient'
                NotificationService.create_notification(
                    recipient=provider_user,
                    sender=deleted_by,
                    notification_type='schedule_cancelled',
                    title='Patient Appointment Cancelled',
                    message=f'Your appointment with {patient_name} on {appointment_date}{appointment_time} has been cancelled' + (f'. Reason: {reason}' if reason else '') + '.',
                    priority='high',
                    schedule=schedule,
                    extra_data={
                        'appointment_date': str(schedule.date),
                        'appointment_time': appointment_time,
                        'patient_name': patient_name,
                        'reason': reason or 'No reason provided',
                        'deleted_by': deleted_by.get_full_name() if deleted_by else 'System'
                    }
                )
                logger.info(f"✅ In-app notification created for provider: {provider_user.get_full_name()}")
            
            # 2. SEND EXTERNAL NOTIFICATIONS (SMS/Email)
            # Create the deletion message for external notifications
            deletion_message = f'Your appointment scheduled for {appointment_date}{appointment_time} has been cancelled'
            if reason:
                deletion_message += f'. Reason: {reason}'
            deletion_message += '. Please contact us if you have any questions.'
            
            # Send to patient and provider
            users_to_notify = []
            if patient_user and patient_user != deleted_by:
                users_to_notify.append(('patient', patient_user))
            if provider_user and provider_user != deleted_by:
                users_to_notify.append(('provider', provider_user))
            
            for user_type, user in users_to_notify:
                NotificationService._send_external_deletion_notification(
                    user, deletion_message, appointment_date, appointment_time, 
                    reason, user_type, deleted_by
                )
            
            # 3. NOTIFY FAMILY MEMBERS
            NotificationService._notify_family_deletion(schedule, deleted_by, reason)
            
            # 4. CALL EXISTING NOTIFICATION METHOD (for compatibility)
            NotificationService.notify_schedule_cancelled(schedule, deleted_by, reason)
            
            logger.info(f"✅ All appointment deletion notifications sent for schedule {schedule.id}")
            
        except Exception as e:
            logger.error(f"❌ Error sending appointment deletion notifications: {str(e)}")
            import traceback
            traceback.print_exc()

    @staticmethod
    def _send_external_deletion_notification(user, message, appointment_date, appointment_time, reason, user_type, deleted_by):
        """
        Send email/SMS notification based on user preferences
        """
        try:
            from account.models import UserPreferences
            from .email_service import EmailService
            from .sms_service import SMSService
            
            # Get user preferences
            try:
                preferences = UserPreferences.objects.get(user=user)
            except UserPreferences.DoesNotExist:
                preferences = UserPreferences.objects.create(user=user)
            
            # Prepare notification details
            subject = "CareLink - Appointment Cancelled"
            sender_info = {
                'user_id': deleted_by.id if deleted_by else None,
                'user_name': deleted_by.get_full_name() if deleted_by else 'System',
                'action': 'appointment_deletion'
            }
            
            # Send email notification if enabled
            if preferences.email_notifications and preferences.appointment_reminders:
                try:
                    email_service = EmailService()
                    
                    # Create detailed email message
                    email_message = f"""
Dear {user.get_full_name()},

Your appointment has been cancelled.

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time.replace(' at ', '') if appointment_time else 'Not specified'}
- Reason: {reason if reason else 'Not specified'}

{message}

If you need to reschedule or have any questions, please contact our support team.

Best regards,
CareLink Team
                    """
                    
                    result = email_service.send_email(
                        to_email=user.email,
                        subject=subject,
                        message=email_message.strip(),
                        sender_info=sender_info
                    )
                    
                    if result.get('success'):
                        logger.info(f"Deletion email sent successfully to {user.email}")
                    else:
                        logger.error(f"Failed to send deletion email to {user.email}: {result.get('error')}")
                        
                except Exception as e:
                    logger.error(f"Error sending deletion email to {user.email}: {str(e)}")
            
            # Send SMS notification if enabled and user has phone number
            if preferences.sms_notifications and preferences.appointment_reminders:
                try:
                    # Get user's primary phone number
                    phone_number = None
                    if preferences.primary_phone_contact:
                        phone_number = preferences.primary_phone_contact.phone_number
                    elif hasattr(user, 'phone_numbers'):
                        primary_phone = user.phone_numbers.filter(is_primary=True).first()
                        if primary_phone:
                            phone_number = primary_phone.phone_number
                    
                    if phone_number:
                        sms_service = SMSService()
                        
                        # Log SMS attempt to operations log
                        sms_logger.info(f"DELETION SMS - Sending to {user.get_full_name()} ({phone_number})")
                        
                        # Create concise SMS message (SMS has character limits)
                        sms_message = f"CareLink: Your appointment on {appointment_date}{appointment_time} has been cancelled"
                        if reason:
                            # Add reason if there's space (keep under 160 chars if possible)
                            if len(sms_message) + len(f". Reason: {reason}") < 150:
                                sms_message += f". Reason: {reason}"
                        sms_message += ". Contact us for questions."
                        
                        sms_logger.info(f"DELETION SMS - Message: {sms_message}")
                        
                        result = sms_service.send_sms(
                            to_number=phone_number,
                            message=sms_message,
                            notification_type='deletion',
                            recipient_email=user.email
                        )
                        
                        if result.get('status') == 'sent':
                            sms_logger.info(f"DELETION SMS - SUCCESS: Sent to {phone_number} (ID: {result.get('external_id')})")
                            logger.info(f"Deletion SMS sent successfully to {phone_number}")
                        else:
                            sms_logger.error(f"DELETION SMS - FAILED: {result.get('error_message')}")
                            logger.error(f"Failed to send deletion SMS to {phone_number}: {result.get('error_message')}")
                    else:
                        sms_logger.info(f"DELETION SMS - SKIPPED: No phone number for {user.email}")
                        logger.info(f"No phone number found for user {user.email}, skipping SMS")
                        
                except Exception as e:
                    logger.error(f"Error sending deletion SMS to user {user.email}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error in _send_external_deletion_notification: {str(e)}")

    @staticmethod
    def _notify_family_deletion(schedule, deleted_by, reason):
        """
        Notify family members about appointment deletion
        """
        try:
            if not schedule.patient:
                return
            
            from CareLink.models import FamilyPatient
            family_relations = FamilyPatient.objects.filter(patient=schedule.patient)
            
            appointment_date = schedule.date.strftime('%B %d, %Y') if schedule.date else 'Unknown date'
            appointment_time = ""
            first_timeslot = schedule.time_slots.first()
            if first_timeslot and first_timeslot.start_time:
                appointment_time = f" at {first_timeslot.start_time.strftime('%H:%M')}"
            
            for relation in family_relations:
                if relation.user and relation.user != deleted_by:
                    # Send in-app notification
                    NotificationService.create_notification(
                        recipient=relation.user,
                        sender=deleted_by,
                        notification_type='schedule_cancelled',
                        title='Family Member Appointment Cancelled',
                        message=f'The appointment for {schedule.patient.user.get_full_name() if schedule.patient.user else "your family member"} on {appointment_date}{appointment_time} has been cancelled',
                        priority='high',
                        schedule=schedule,
                        extra_data={
                            'appointment_date': str(schedule.date),
                            'patient_name': schedule.patient.user.get_full_name() if schedule.patient.user else 'Unknown',
                            'family_relation': relation.link,
                            'reason': reason or 'No reason provided'
                        }
                    )
                    
                    # Send external notifications based on family member's preferences
                    family_message = f'The appointment for your family member {schedule.patient.user.get_full_name() if schedule.patient.user else "a family member"} on {appointment_date}{appointment_time} has been cancelled'
                    if reason:
                        family_message += f'. Reason: {reason}'
                    family_message += '. Please contact us if you have any questions.'
                    
                    NotificationService._send_external_deletion_notification(
                        relation.user, family_message, appointment_date, 
                        appointment_time, reason, 'family', deleted_by
                    )
                    
        except Exception as e:
            logger.error(f"Error notifying family members about deletion: {str(e)}")

    @staticmethod
    def _should_send_notification(user, notification_type):
        """Check if user wants to receive this type of notification"""
        try:
            preferences = NotificationPreference.objects.get(user=user)
            
            # Check if app notifications are enabled
            if not preferences.app_enabled:
                return False
            
            # Check specific notification type preferences
            if notification_type.startswith('schedule_') and not preferences.app_schedule_changes:
                return False
            elif notification_type.startswith('ticket_') and not preferences.app_new_tickets:
                return False
            elif notification_type.endswith('_comment') and not preferences.app_comments:
                return False
            
            return True
            
        except NotificationPreference.DoesNotExist:
            # If no preferences exist, create default ones and allow notification
            NotificationPreference.objects.create(user=user)
            return True
    
    @staticmethod
    def notify_schedule_created(schedule, created_by):
        """Send notifications when a new appointment is scheduled"""
        patient_user = schedule.patient.user if schedule.patient else None
        provider_user = schedule.provider.user if schedule.provider else None
        
        # Notify patient
        if patient_user:
            NotificationService.create_notification(
                recipient=patient_user,
                sender=created_by,
                notification_type='schedule_new',
                title='New Appointment Scheduled',
                message=f'A new appointment has been scheduled for {schedule.date} with {provider_user.get_full_name() if provider_user else "a provider"}',
                priority='normal',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'provider_name': provider_user.get_full_name() if provider_user else 'Unknown'
                }
            )
        
        # Notify provider
        if provider_user and provider_user != created_by:
            NotificationService.create_notification(
                recipient=provider_user,
                sender=created_by,
                notification_type='schedule_new',
                title='New Appointment Assignment',
                message=f'You have been assigned a new appointment with {patient_user.get_full_name() if patient_user else "a patient"} on {schedule.date}',
                priority='normal',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'patient_name': patient_user.get_full_name() if patient_user else 'Unknown'
                }
            )
        
        # Notify family members
        NotificationService._notify_family_members(schedule, 'schedule_new', 'New Appointment Scheduled', 
            f'A new appointment has been scheduled for {patient_user.get_full_name() if patient_user else "your family member"} on {schedule.date}',
            created_by)
    
    @staticmethod
    def notify_schedule_updated(schedule, updated_by, changes=None):
        """Send notifications when an appointment is updated"""
        patient_user = schedule.patient.user if schedule.patient else None
        provider_user = schedule.provider.user if schedule.provider else None
        
        # Get appointment time and status information
        appointment_time = ""
        appointment_status = ""
        first_timeslot = schedule.time_slots.first()
        if first_timeslot:
            if first_timeslot.start_time:
                appointment_time = f" at {first_timeslot.start_time.strftime('%H:%M')}"
            if hasattr(first_timeslot, 'status') and first_timeslot.status:
                status_display = first_timeslot.status.replace('_', ' ').title()
                appointment_status = f" is {status_display.lower()}"
        
        # Notify patient
        if patient_user and patient_user != updated_by:
            # Get provider name for context
            provider_name = provider_user.get_full_name() if provider_user else 'your healthcare provider'
            
            NotificationService.create_notification(
                recipient=patient_user,
                sender=updated_by,
                notification_type='schedule_modified',
                title='Appointment Updated',
                message=f'Your appointment with {provider_name} on {schedule.date}{appointment_time}{appointment_status}. Please review the updated details.',
                priority='normal',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'appointment_time': appointment_time,
                    'provider_name': provider_name,
                    'changes': changes or []
                }
            )
        
        # Notify provider
        if provider_user and provider_user != updated_by:
            # Get patient name for context
            patient_name = patient_user.get_full_name() if patient_user else 'a patient'
            
            NotificationService.create_notification(
                recipient=provider_user,
                sender=updated_by,
                notification_type='schedule_modified',
                title='Appointment Updated',
                message=f'Your appointment with {patient_name} on {schedule.date}{appointment_time}{appointment_status}. Please review the updated details.',
                priority='normal',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'appointment_time': appointment_time,
                    'patient_name': patient_name,
                    'changes': changes or []
                }
            )
        
        # Notify family members
        patient_name = patient_user.get_full_name() if patient_user else "your family member"
        NotificationService._notify_family_members(schedule, 'schedule_modified', 'Appointment Updated',
            f'{patient_name}\'s appointment on {schedule.date}{appointment_time}{appointment_status}. Please review the updated details.',
            updated_by)
    
    @staticmethod
    def notify_schedule_cancelled(schedule, cancelled_by, reason=None):
        """Send notifications when an appointment is cancelled"""
        patient_user = schedule.patient.user if schedule.patient else None
        provider_user = schedule.provider.user if schedule.provider else None
        
        message = f'The appointment scheduled for {schedule.date} has been cancelled'
        if reason:
            message += f'. Reason: {reason}'
        
        # Notify patient
        if patient_user and patient_user != cancelled_by:
            NotificationService.create_notification(
                recipient=patient_user,
                sender=cancelled_by,
                notification_type='schedule_cancelled',
                title='Appointment Cancelled',
                message=message,
                priority='high',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'reason': reason or 'No reason provided'
                }
            )
        
        # Notify provider
        if provider_user and provider_user != cancelled_by:
            NotificationService.create_notification(
                recipient=provider_user,
                sender=cancelled_by,
                notification_type='schedule_cancelled',
                title='Appointment Cancelled',
                message=f'Your appointment with {patient_user.get_full_name() if patient_user else "a patient"} on {schedule.date} has been cancelled',
                priority='high',
                schedule=schedule,
                extra_data={
                    'appointment_date': str(schedule.date),
                    'patient_name': patient_user.get_full_name() if patient_user else 'Unknown',
                    'reason': reason or 'No reason provided'
                }
            )
        
        # Notify family members
        NotificationService._notify_family_members(schedule, 'schedule_cancelled', 'Appointment Cancelled',
            f'The appointment for {patient_user.get_full_name() if patient_user else "your family member"} on {schedule.date} has been cancelled',
            cancelled_by)
    
    @staticmethod
    def notify_ticket_created(ticket, created_by):
        """Send notifications when a new ticket is created"""
        # Notify team members based on assigned team
        if ticket.assigned_team == 'Coordinator':
            # Notify all coordinators
            team_members = User.objects.filter(role='Coordinator', is_active=True)
        elif ticket.assigned_team == 'Administrator':
            # Notify all administrators
            team_members = User.objects.filter(role__in=['Administrator', 'Administrative'], is_active=True)
        else:
            # Fallback: notify both coordinators and administrators
            team_members = User.objects.filter(role__in=['Coordinator', 'Administrator', 'Administrative'], is_active=True)
        
        for team_member in team_members:
            if team_member != created_by:
                NotificationService.create_notification(
                    recipient=team_member,
                    sender=created_by,
                    notification_type='ticket_new',
                    title='New Helpdesk Ticket',
                    message=f'New ticket assigned to {ticket.assigned_team} team: {ticket.title}',
                    priority='normal',
                    ticket=ticket,
                    extra_data={
                        'ticket_category': ticket.category,
                        'ticket_priority': ticket.priority,
                        'assigned_team': ticket.assigned_team
                    }
                )
    
    @staticmethod
    def notify_ticket_updated(ticket, updated_by, update_type='updated'):
        """Send notifications when a ticket is updated"""
        # Notify ticket creator
        if ticket.created_by and ticket.created_by != updated_by:
            NotificationService.create_notification(
                recipient=ticket.created_by,
                sender=updated_by,
                notification_type='ticket_updated',
                title=f'Ticket {update_type.title()}',
                message=f'Your ticket "{ticket.title}" has been {update_type}',
                priority='normal',
                ticket=ticket,
                extra_data={
                    'update_type': update_type,
                    'ticket_status': ticket.status
                }
            )
    
    @staticmethod
    def notify_ticket_assigned(ticket, assigned_by, previous_assignee=None):
        """Send notifications when a ticket is assigned"""
        # Notify ticket creator
        if ticket.created_by and ticket.created_by != assigned_by:
            NotificationService.create_notification(
                recipient=ticket.created_by,
                sender=assigned_by,
                notification_type='ticket_assigned',
                title='Ticket Assigned',
                message=f'Your ticket "{ticket.title}" has been assigned to {assigned_by.get_full_name()}',
                priority='normal',
                ticket=ticket,
                extra_data={
                    'assigned_to': assigned_by.get_full_name(),
                    'previous_assignee': previous_assignee.get_full_name() if previous_assignee else None
                }
            )
    
    @staticmethod
    def notify_ticket_comment(comment, comment_author):
        """Send notifications when a comment is added to a ticket"""
        ticket = comment.ticket
        
        # Notify ticket creator if they didn't make the comment
        if ticket.created_by and ticket.created_by != comment_author:
            NotificationService.create_notification(
                recipient=ticket.created_by,
                sender=comment_author,
                notification_type='ticket_comment',
                title='New Ticket Comment',
                message=f'A new comment has been added to your ticket "{ticket.title}"',
                priority='normal',
                ticket=ticket,
                extra_data={
                    'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment
                }
            )
        
        # Notify assigned user if they didn't make the comment
        if ticket.assigned_to and ticket.assigned_to != comment_author and ticket.assigned_to != ticket.created_by:
            NotificationService.create_notification(
                recipient=ticket.assigned_to,
                sender=comment_author,
                notification_type='ticket_comment',
                title='New Ticket Comment',
                message=f'A new comment has been added to ticket "{ticket.title}"',
                priority='normal',
                ticket=ticket,
                extra_data={
                    'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment
                }
            )
        
        # Notify team members when ticket creator responds
        if comment_author == ticket.created_by:
            # The ticket creator is responding - notify the assigned team
            if ticket.assigned_team == 'Coordinator':
                team_members = User.objects.filter(role='Coordinator', is_active=True)
            elif ticket.assigned_team == 'Administrator':
                team_members = User.objects.filter(role__in=['Administrator', 'Administrative'], is_active=True)
            else:
                team_members = User.objects.filter(role__in=['Coordinator', 'Administrator', 'Administrative'], is_active=True)
            
            for team_member in team_members:
                if team_member != comment_author:
                    NotificationService.create_notification(
                        recipient=team_member,
                        sender=comment_author,
                        notification_type='ticket_comment',
                        title='Ticket Response',
                        message=f'The ticket creator has responded to ticket "{ticket.title}"',
                        priority='normal',
                        ticket=ticket,
                        extra_data={
                            'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment,
                            'is_creator_response': True
                        }
                    )
    
    @staticmethod
    def notify_comment_added(comment, comment_type='appointment'):
        """Send notifications when a comment is added"""
        if comment_type == 'appointment' and hasattr(comment, 'timeslot'):
            # Appointment comment
            schedule = comment.timeslot.schedule_set.first()
            if schedule:
                patient_user = schedule.patient.user if schedule.patient else None
                provider_user = schedule.provider.user if schedule.provider else None
                
                # Notify provider about patient comment
                if provider_user and provider_user != comment.created_by:
                    NotificationService.create_notification(
                        recipient=provider_user,
                        sender=comment.created_by,
                        notification_type='appointment_comment',
                        title='New Appointment Comment',
                        message=f'A comment has been added to the appointment with {patient_user.get_full_name() if patient_user else "a patient"} on {schedule.date}',
                        priority='normal',
                        schedule=schedule,
                        extra_data={
                            'appointment_date': str(schedule.date),
                            'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment
                        }
                    )
                
                # Notify coordinators about patient comment
                coordinators = User.objects.filter(role='Coordinator', is_active=True)
                for coordinator in coordinators:
                    if coordinator != comment.created_by:
                        NotificationService.create_notification(
                            recipient=coordinator,
                            sender=comment.created_by,
                            notification_type='appointment_comment',
                            title='New Appointment Comment',
                            message=f'{patient_user.get_full_name() if patient_user else "A patient"} added a comment to their appointment on {schedule.date}',
                            priority='normal',
                            schedule=schedule,
                            extra_data={
                                'appointment_date': str(schedule.date),
                                'patient_name': patient_user.get_full_name() if patient_user else 'Unknown',
                                'provider_name': provider_user.get_full_name() if provider_user else 'Unknown',
                                'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment
                            }
                        )
        
        elif comment_type == 'ticket' and hasattr(comment, 'ticket'):
            # Ticket comment
            ticket = comment.ticket
            
            # Notify ticket creator if they didn't make the comment
            if ticket.created_by and ticket.created_by != comment.created_by:
                NotificationService.create_notification(
                    recipient=ticket.created_by,
                    sender=comment.created_by,
                    notification_type='ticket_comment',
                    title='New Ticket Comment',
                    message=f'A new comment has been added to your ticket "{ticket.title}"',
                    priority='normal',
                    ticket=ticket,
                    extra_data={
                        'comment_preview': comment.comment[:100] + '...' if len(comment.comment) > 100 else comment.comment
                    }
                )
    
    @staticmethod
    def _notify_family_members(schedule, notification_type, title, message, sender):
        """Helper method to notify family members of a patient"""
        if not schedule.patient:
            return
        
        try:
            from CareLink.models import FamilyPatient
            family_relations = FamilyPatient.objects.filter(patient=schedule.patient)
            
            for relation in family_relations:
                if relation.user and relation.user != sender:
                    NotificationService.create_notification(
                        recipient=relation.user,
                        sender=sender,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        priority='normal',
                        schedule=schedule,
                        extra_data={
                            'appointment_date': str(schedule.date),
                            'patient_name': schedule.patient.user.get_full_name() if schedule.patient.user else 'Unknown',
                            'family_relation': relation.link
                        }
                    )
        except Exception as e:
            logger.error(f"Error notifying family members: {str(e)}")
    
    @staticmethod
    def notify_service_demand_created(service_demand, created_by):
        """Send notifications when a new service demand is created"""
        # Notify coordinators
        coordinators = User.objects.filter(role='Coordinator', is_active=True)
        
        for coordinator in coordinators:
            if coordinator != created_by:
                NotificationService.create_notification(
                    recipient=coordinator,
                    sender=created_by,
                    notification_type='demand_new',
                    title='New Service Demand',
                    message=f'New service demand: {service_demand.title}',
                    priority='normal',
                    service_demand=service_demand,
                    extra_data={
                        'service_name': service_demand.service.name if service_demand.service else 'Unknown',
                        'priority': service_demand.priority
                    }
                )
    
    @staticmethod
    def notify_service_demand_comment(service_demand, comment_author, comment_text):
        """Send notification to patient when coordinator adds a comment to their service demand"""
        try:
            # Get the patient who created the service demand
            patient_user = None
            
            # Check if the service demand was sent by a patient directly
            if service_demand.sent_by and service_demand.sent_by.role == 'Patient':
                patient_user = service_demand.sent_by
            # Or if it was sent by a family member for a patient
            elif service_demand.patient and service_demand.patient.user:
                patient_user = service_demand.patient.user
            
            # Only send notification if we have a patient and the comment author is not the patient
            if patient_user and patient_user != comment_author:
                # Check if the comment author is a coordinator/admin
                if comment_author.role in ['Coordinator', 'Administrative']:
                    NotificationService.create_notification(
                        recipient=patient_user,
                        sender=comment_author,
                        notification_type='service_demand_update',
                        title='Update on Your Service Request',
                        message=f'Your care team has added an update to your service request: {service_demand.title}',
                        priority='normal',
                        service_demand=service_demand,
                        extra_data={
                            'service_name': service_demand.service.name if service_demand.service else 'Unknown',
                            'coordinator_name': f"{comment_author.firstname} {comment_author.lastname}",
                            'comment_preview': comment_text[:100] + "..." if len(comment_text) > 100 else comment_text
                        }
                    )
                    logger.info(f"Service demand comment notification sent to {patient_user.email}")
                else:
                    logger.info(f"Comment author {comment_author.email} is not a coordinator, skipping notification")
            else:
                logger.info(f"No patient found or comment author is patient, skipping notification")
                
        except Exception as e:
            logger.error(f"Error sending service demand comment notification: {str(e)}")
    
    @staticmethod
    def get_notification_count(user, unread_only=True):
        """Get notification count for a user"""
        queryset = Notification.objects.filter(recipient=user)
        if unread_only:
            queryset = queryset.filter(is_read=False)
        return queryset.count()
    
    @staticmethod
    def mark_notifications_read(user, notification_ids=None):
        """Mark notifications as read for a user"""
        queryset = Notification.objects.filter(recipient=user, is_read=False)
        if notification_ids:
            queryset = queryset.filter(id__in=notification_ids)
        
        return queryset.update(is_read=True, read_at=timezone.now()) 