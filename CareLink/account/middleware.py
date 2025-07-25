import logging
from django.utils.deprecation import MiddlewareMixin
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from CareLink.models import UserActionLog

logger = logging.getLogger('carelink.admin')

class AdminActionLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log admin actions for better monitoring and auditing
    """
    
    def process_response(self, request, response):
        # Only log admin actions
        if request.path.startswith('/admin/') and request.user.is_authenticated:
            self.log_admin_action(request, response)
        return response
    
    def log_admin_action(self, request, response):
        try:
            # Get the last log entry for this user
            if hasattr(request, 'user') and request.user.is_authenticated:
                recent_entries = LogEntry.objects.filter(
                    user=request.user
                ).order_by('-action_time')[:1]
                
                if recent_entries:
                    entry = recent_entries[0]
                    action_type = self.get_action_type(entry.action_flag)
                    
                    # Log to our custom UserActionLog model
                    UserActionLog.objects.create(
                        user=request.user,
                        action_type=f"ADMIN_{action_type}",
                        target_model=entry.content_type.model if entry.content_type else None,
                        target_id=entry.object_id
                    )
                    
                    # Log to file
                    logger.info(
                        f"Admin action: {action_type} on {entry.content_type.model if entry.content_type else 'unknown'} "
                        f"(ID: {entry.object_id}) by {request.user.email} - {entry.object_repr}"
                    )
        
        except Exception as e:
            logger.error(f"Error logging admin action: {str(e)}")
    
    def get_action_type(self, action_flag):
        action_mapping = {
            ADDITION: 'CREATE',
            CHANGE: 'UPDATE',
            DELETION: 'DELETE'
        }
        return action_mapping.get(action_flag, 'UNKNOWN')


class SecurityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log security-related events
    """
    
    def process_request(self, request):
        # Log suspicious activities
        self.log_security_events(request)
        return None
    
    def log_security_events(self, request):
        try:
            # Log failed admin login attempts
            if request.path == '/admin/login/' and request.method == 'POST':
                if 'username' in request.POST:
                    username = request.POST.get('username', 'unknown')
                    logger.warning(f"Admin login attempt for username: {username} from IP: {self.get_client_ip(request)}")
            
            # Log admin access
            if request.path.startswith('/admin/') and request.user.is_authenticated:
                if not hasattr(request, '_admin_access_logged'):
                    logger.info(f"Admin access by {request.user.email} from IP: {self.get_client_ip(request)}")
                    request._admin_access_logged = True
                    
        except Exception as e:
            logger.error(f"Error in security logging: {str(e)}")
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
