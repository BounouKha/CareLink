"""
Activity Logger Service
Automatically logs user activities to the database for admin panel display
"""

import json
from datetime import datetime
from django.utils import timezone
from CareLink.models import UserActionLog, User

class ActivityLogger:
    """Service for logging user activities to the database"""
    
    @staticmethod
    def log_login(user, ip_address=None, user_agent=None):
        """Log successful login"""
        additional_data = {
            'ip_address': ip_address,
            'user_agent': user_agent[:100] if user_agent else None,
            'login_method': 'web',
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='LOGIN_SUCCESSFUL',
            target_model='User',
            target_id=user.id,
            description=f"User {user.firstname} {user.lastname} ({user.role}) logged in successfully",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_login_failed(email, ip_address=None, user_agent=None):
        """Log failed login attempt"""
        additional_data = {
            'ip_address': ip_address,
            'user_agent': user_agent[:100] if user_agent else None,
            'login_method': 'web',
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=None,  # No user for failed login
            action_type='LOGIN_FAILED',
            target_model='User',
            target_id=None,
            description=f"Failed login attempt for email: {email}",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_logout(user, ip_address=None, user_agent=None, token_blacklisted=True):
        """Log user logout"""
        additional_data = {
            'ip_address': ip_address,
            'user_agent': user_agent[:100] if user_agent else None,
            'token_blacklisted': token_blacklisted,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='LOGOUT_SUCCESSFUL',
            target_model='User',
            target_id=user.id,
            description=f"User {user.firstname} {user.lastname} ({user.role}) logged out successfully",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_ticket_created(ticket, user):
        """Log ticket creation"""
        additional_data = {
            'ticket_id': ticket.id,
            'ticket_title': ticket.title,
            'category': ticket.category,
            'priority': ticket.priority,
            'assigned_team': ticket.assigned_team,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='TICKET_CREATED',
            target_model='EnhancedTicket',
            target_id=ticket.id,
            description=f"Ticket '{ticket.title}' created by {user.firstname} {user.lastname} ({user.role})",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_ticket_updated(ticket, user, previous_status=None, new_status=None):
        """Log ticket update"""
        additional_data = {
            'ticket_id': ticket.id,
            'ticket_title': ticket.title,
            'previous_status': previous_status,
            'new_status': new_status,
            'timestamp': timezone.now().isoformat()
        }
        
        if previous_status and new_status and previous_status != new_status:
            action_type = 'TICKET_STATUS_CHANGED'
            description = f"Ticket '{ticket.title}' status changed from {previous_status} to {new_status} by {user.firstname} {user.lastname} ({user.role})"
        else:
            action_type = 'TICKET_UPDATED'
            description = f"Ticket '{ticket.title}' updated by {user.firstname} {user.lastname} ({user.role})"
        
        UserActionLog.objects.create(
            user=user,
            action_type=action_type,
            target_model='EnhancedTicket',
            target_id=ticket.id,
            description=description,
            additional_data=additional_data
        )
    
    @staticmethod
    def log_ticket_assigned(ticket, user, previous_assignee=None):
        """Log ticket assignment"""
        additional_data = {
            'ticket_id': ticket.id,
            'ticket_title': ticket.title,
            'previous_assignee': f"{previous_assignee.firstname} {previous_assignee.lastname}" if previous_assignee else "Unassigned",
            'new_assignee': f"{ticket.assigned_to.firstname} {ticket.assigned_to.lastname}" if ticket.assigned_to else "Unassigned",
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='TICKET_ASSIGNED',
            target_model='EnhancedTicket',
            target_id=ticket.id,
            description=f"Ticket '{ticket.title}' assigned to {ticket.assigned_to.firstname} {ticket.assigned_to.lastname} by {user.firstname} {user.lastname} ({user.role})",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_comment_created(comment, user):
        """Log comment creation"""
        additional_data = {
            'ticket_id': comment.ticket.id,
            'ticket_title': comment.ticket.title,
            'comment_id': comment.id,
            'comment_preview': comment.comment[:100] + "..." if len(comment.comment) > 100 else comment.comment,
            'is_internal': comment.is_internal,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='TICKET_COMMENT_CREATED',
            target_model='TicketComment',
            target_id=comment.id,
            description=f"Comment added to ticket '{comment.ticket.title}' by {user.firstname} {user.lastname} ({user.role})",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_comment_updated(comment, user):
        """Log comment update"""
        additional_data = {
            'ticket_id': comment.ticket.id,
            'ticket_title': comment.ticket.title,
            'comment_id': comment.id,
            'comment_preview': comment.comment[:100] + "..." if len(comment.comment) > 100 else comment.comment,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='TICKET_COMMENT_UPDATED',
            target_model='TicketComment',
            target_id=comment.id,
            description=f"Comment updated on ticket '{comment.ticket.title}' by {user.firstname} {user.lastname} ({user.role})",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_comment_deleted(ticket_id, ticket_title, comment_id, user):
        """Log comment deletion"""
        additional_data = {
            'ticket_id': ticket_id,
            'ticket_title': ticket_title,
            'comment_id': comment_id,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='TICKET_COMMENT_DELETED',
            target_model='TicketComment',
            target_id=comment_id,
            description=f"Comment deleted from ticket '{ticket_title}' by {user.firstname} {user.lastname} ({user.role})",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_unauthorized_access(user, action, target_model, target_id, ip_address=None):
        """Log unauthorized access attempts"""
        additional_data = {
            'ip_address': ip_address,
            'action_attempted': action,
            'target_model': target_model,
            'target_id': target_id,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='UNAUTHORIZED_ACCESS',
            target_model=target_model,
            target_id=target_id,
            description=f"Unauthorized access attempt by {user.firstname} {user.lastname} ({user.role}) - {action}",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_invoice_generated(invoice, user):
        """Log invoice generation"""
        additional_data = {
            'invoice_id': invoice.id,
            'patient_name': f"{invoice.patient.user.firstname} {invoice.patient.user.lastname}" if invoice.patient and invoice.patient.user else "Unknown",
            'amount': str(invoice.amount),
            'status': invoice.status,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='INVOICE_GENERATED',
            target_model='Invoice',
            target_id=invoice.id,
            description=f"Invoice generated for {additional_data['patient_name']} - Amount: {invoice.amount}",
            additional_data=additional_data
        )
    
    @staticmethod
    def log_invoice_contested(invoice, user, reason):
        """Log invoice contest"""
        additional_data = {
            'invoice_id': invoice.id,
            'patient_name': f"{invoice.patient.user.firstname} {invoice.patient.user.lastname}" if invoice.patient and invoice.patient.user else "Unknown",
            'reason': reason,
            'timestamp': timezone.now().isoformat()
        }
        
        UserActionLog.objects.create(
            user=user,
            action_type='INVOICE_CONTESTED',
            target_model='Invoice',
            target_id=invoice.id,
            description=f"Invoice contested by {user.firstname} {user.lastname} ({user.role}) - Reason: {reason}",
            additional_data=additional_data
        )
    
    @staticmethod
    def get_recent_activities(hours=24, user=None, action_type=None):
        """Get recent activities for admin panel"""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_time = timezone.now() - timedelta(hours=hours)
        queryset = UserActionLog.objects.filter(created_at__gte=cutoff_time)
        
        if user:
            queryset = queryset.filter(user=user)
        
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        return queryset.order_by('-created_at')
    
    @staticmethod
    def get_user_activity_summary(user, days=7):
        """Get activity summary for a specific user"""
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_time = timezone.now() - timedelta(days=days)
        activities = UserActionLog.objects.filter(
            user=user,
            created_at__gte=cutoff_time
        )
        
        summary = {
            'total_activities': activities.count(),
            'login_count': activities.filter(action_type='LOGIN_SUCCESSFUL').count(),
            'ticket_activities': activities.filter(action_type__startswith='TICKET').count(),
            'invoice_activities': activities.filter(action_type__startswith='INVOICE').count(),
            'last_activity': activities.first().created_at if activities.exists() else None,
        }
        
        return summary 