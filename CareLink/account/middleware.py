import logging
from django.utils.deprecation import MiddlewareMixin
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from CareLink.models import UserActionLog
from .services.lightweight_ids import lightweight_ids

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


class SecurityMiddleware(MiddlewareMixin):
    """
    Lightweight Security Middleware
    Integrates IDS analysis with request processing
    """
    
    def process_request(self, request):
        """Process request through security analysis"""
        
        # Skip analysis for certain paths
        skip_paths = [
            '/static/',
            '/media/',
            '/favicon.ico',
            '/robots.txt',
            '/health/',
        ]
        
        path = request.path.lower()
        if any(skip_path in path for skip_path in skip_paths):
            return None
        
        try:
            logger.debug(f"SecurityMiddleware: Analyzing request {request.method} {request.path} from {request.META.get('REMOTE_ADDR', 'unknown')}")
            
            # Analyze request for threats
            analysis = lightweight_ids.analyze_request(request)
            
            # Store analysis results for potential use in process_response
            request._security_analysis = analysis
            
            # Log security events
            if analysis['threats']:
                logger.warning(
                    f"Security threats detected - Level: {analysis['level']} - "
                    f"IP: {analysis['client_ip']} - Path: {request.path} - "
                    f"Threats: {len(analysis['threats'])}"
                )
            else:
                logger.debug(f"SecurityMiddleware: No threats detected for {request.path}")
            
            # For critical threats, we could block the request
            # For now, we just log and notify
            if analysis['level'] == 'CRITICAL':
                logger.critical(
                    f"CRITICAL security threat from {analysis['client_ip']} - "
                    f"Path: {request.path}"
                )
            
        except Exception as e:
            logger.error(f"Error in security middleware: {e}")
        
        return None
    
    def process_response(self, request, response):
        """Process response and log security events"""
        try:
            # Log security analysis results if available
            if hasattr(request, '_security_analysis'):
                analysis = request._security_analysis
                if analysis['threats']:
                    logger.info(
                        f"Security analysis completed - Threats: {len(analysis['threats'])} - "
                        f"Level: {analysis['level']} - Response: {response.status_code}"
                    )
        except Exception as e:
            logger.error(f"Error in security middleware response processing: {e}")
        
        return response
