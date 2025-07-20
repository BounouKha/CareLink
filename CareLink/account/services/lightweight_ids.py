import re
import json
import logging
from datetime import datetime, timedelta
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth import get_user_model
from CareLink.models import UserActionLog

logger = logging.getLogger(__name__)
User = get_user_model()

class LightweightIDS:
    """
    Lightweight Intrusion Detection System
    Focuses on specific threats and integrates with notification system
    """
    
    def __init__(self):
        # Threat patterns
        self.threat_patterns = {
            'xss': [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
                r'<iframe[^>]*>',
                r'<object[^>]*>',
                r'<embed[^>]*>',
                r'<form[^>]*>',
                r'<input[^>]*>',
            ],
            'sql_injection': [
                r'\b(union|select|insert|update|delete|drop|create|alter)\b',
                r'\b(exec|execute|script)\b',
                r'--|\b(comment)\b',
                r'\b(admin|root|system)\b',
                r'(\'|\")\s*(or|and)\s*\d+\s*=\s*\d+',
                r'(\'|\")\s*(or|and)\s*\d+\s*=\s*\d+\s*--',
            ],
            'path_traversal': [
                r'\.\./|\.\.\\',
                r'/etc/passwd|/etc/shadow',
                r'c:\\windows\\system32',
                r'%2e%2e%2f|%2e%2e%5c',
            ],
            'command_injection': [
                r'\b(cat|ls|dir|rm|del|mkdir|touch)\b',
                r'\b(wget|curl|nc|telnet|ssh)\b',
                r'\b(ping|nslookup|traceroute)\b',
                r'(\||&|;|\$\(|\`)',
            ],
            'weird_upload': [
                r'\.(php|asp|aspx|jsp|jspx|pl|py|rb|sh|bat|cmd|exe|dll|so|dylib)$',
                r'<%\s*.*\s*%>',
                r'<\?php\s+.*\?>',
                r'<%@\s+.*\s+%>',
            ]
        }
        
        # Rate limits for non-login endpoints
        self.rate_limits = {
            'api_requests': {'max': 100, 'window': 60},  # 100 requests per minute
            'admin_access': {'max': 5, 'window': 300},   # 5 admin attempts per 5 minutes
            'upload_attempts': {'max': 10, 'window': 300}, # 10 uploads per 5 minutes
        }
        
        # Track token usage across IPs
        self.token_ip_mapping = {}
        
    def analyze_request(self, request):
        """Analyze request for security threats"""
        threats = []
        client_ip = self.get_client_ip(request)
        path = request.path.lower()
        method = request.method
        user = getattr(request, 'user', None)
        
        # Skip analysis for trusted IPs (localhost) - DISABLED FOR TESTING
        # if client_ip in {'127.0.0.1', 'localhost', '::1'}:
        #     logger.info(f"IDS: Skipping analysis for trusted IP: {client_ip}")
        #     return {'threats': [], 'level': 'LOW'}
        
        # 1. Check for XSS attacks
        xss_threats = self.detect_xss(request)
        if xss_threats:
            threats.extend(xss_threats)
        
        # 2. Check for SQL injection
        sql_threats = self.detect_sql_injection(request)
        if sql_threats:
            threats.extend(sql_threats)
        
        # 3. Check for path traversal
        path_threats = self.detect_path_traversal(request)
        if path_threats:
            threats.extend(path_threats)
        
        # 4. Check for command injection
        cmd_threats = self.detect_command_injection(request)
        if cmd_threats:
            threats.extend(cmd_threats)
        
        # 5. Check for weird uploads
        upload_threats = self.detect_weird_uploads(request)
        if upload_threats:
            threats.extend(upload_threats)
        
        # 6. Check admin panel access attempts
        admin_threats = self.detect_admin_access_attempts(request, client_ip)
        if admin_threats:
            threats.extend(admin_threats)
        
        # 7. Check token security
        token_threats = self.detect_token_issues(request, client_ip)
        if token_threats:
            threats.extend(token_threats)
        
        # 8. Check rate limits (for non-login endpoints)
        if 'login' not in path:
            rate_threats = self.check_rate_limits(client_ip, path)
            if rate_threats:
                threats.extend(rate_threats)
        
        # Determine threat level
        threat_level = self.determine_threat_level(threats)
        
        # Send notifications if threats detected
        if threats:
            logger.warning(f"IDS: Threats detected! {len(threats)} threats from {client_ip} on {path}")
            self.send_security_notification(threats, client_ip, path, user)
        else:
            logger.debug(f"IDS: No threats detected from {client_ip} on {path}")
        
        return {
            'threats': threats,
            'level': threat_level,
            'client_ip': client_ip
        }
    
    def detect_xss(self, request):
        """Detect XSS attacks"""
        threats = []
        request_data = self.extract_request_data(request)
        
        for key, value in request_data.items():
            if isinstance(value, str):
                for pattern in self.threat_patterns['xss']:
                    if re.search(pattern, value, re.IGNORECASE):
                        threats.append({
                            'type': 'xss_attack',
                            'field': key,
                            'pattern': pattern,
                            'value': value[:100]
                        })
        
        return threats
    
    def detect_sql_injection(self, request):
        """Detect SQL injection attempts"""
        threats = []
        request_data = self.extract_request_data(request)
        
        for key, value in request_data.items():
            if isinstance(value, str):
                for pattern in self.threat_patterns['sql_injection']:
                    if re.search(pattern, value, re.IGNORECASE):
                        threats.append({
                            'type': 'sql_injection',
                            'field': key,
                            'pattern': pattern,
                            'value': value[:100]
                        })
        
        return threats
    
    def detect_path_traversal(self, request):
        """Detect path traversal attempts"""
        threats = []
        path = request.path
        request_data = self.extract_request_data(request)
        
        # Check URL path
        for pattern in self.threat_patterns['path_traversal']:
            if re.search(pattern, path, re.IGNORECASE):
                threats.append({
                    'type': 'path_traversal',
                    'pattern': pattern,
                    'path': path
                })
        
        # Check request data
        for key, value in request_data.items():
            if isinstance(value, str):
                for pattern in self.threat_patterns['path_traversal']:
                    if re.search(pattern, value, re.IGNORECASE):
                        threats.append({
                            'type': 'path_traversal',
                            'field': key,
                            'pattern': pattern,
                            'value': value[:100]
                        })
        
        return threats
    
    def detect_command_injection(self, request):
        """Detect command injection attempts"""
        threats = []
        request_data = self.extract_request_data(request)
        
        for key, value in request_data.items():
            if isinstance(value, str):
                for pattern in self.threat_patterns['command_injection']:
                    if re.search(pattern, value, re.IGNORECASE):
                        threats.append({
                            'type': 'command_injection',
                            'field': key,
                            'pattern': pattern,
                            'value': value[:100]
                        })
        
        return threats
    
    def detect_weird_uploads(self, request):
        """Detect suspicious file uploads"""
        threats = []
        
        if request.method == 'POST' and request.FILES:
            for filename in request.FILES:
                file_obj = request.FILES[filename]
                if hasattr(file_obj, 'name'):
                    for pattern in self.threat_patterns['weird_upload']:
                        if re.search(pattern, file_obj.name, re.IGNORECASE):
                            threats.append({
                                'type': 'weird_upload',
                                'filename': file_obj.name,
                                'pattern': pattern,
                                'size': getattr(file_obj, 'size', 0)
                            })
        
        return threats
    
    def detect_admin_access_attempts(self, request, client_ip):
        """Detect admin panel access attempts"""
        threats = []
        path = request.path.lower()
        user = getattr(request, 'user', None)
        
        # Check for admin panel access
        if '/admin/' in path or 'admin' in path:
            if not user or not user.is_superuser:
                threats.append({
                    'type': 'admin_access_attempt',
                    'path': path,
                    'user_authenticated': bool(user and not user.is_anonymous),
                    'is_superuser': bool(user and user.is_superuser)
                })
        
        return threats
    
    def detect_token_issues(self, request, client_ip):
        """Detect token-related security issues"""
        threats = []
        
        # Check for missing or invalid tokens on protected endpoints
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        path = request.path.lower()
        
        # Protected endpoints that require authentication
        protected_endpoints = [
            '/account/profile/',
            '/account/ids/',
            '/admin/',
            '/account/invoices/',
            '/account/notifications/',
        ]
        
        is_protected = any(endpoint in path for endpoint in protected_endpoints)
        
        if is_protected:
            if not auth_header or not auth_header.startswith('Bearer '):
                threats.append({
                    'type': 'missing_token',
                    'path': path,
                    'auth_header': auth_header[:50] if auth_header else 'None'
                })
            else:
                # Check for token reuse across different IPs
                token = auth_header.split(' ')[1]
                if token in self.token_ip_mapping:
                    previous_ip = self.token_ip_mapping[token]
                    if previous_ip != client_ip:
                        threats.append({
                            'type': 'token_reuse_different_ip',
                            'token': token[:20] + '...',
                            'previous_ip': previous_ip,
                            'current_ip': client_ip
                        })
                else:
                    self.token_ip_mapping[token] = client_ip
        
        return threats
    
    def check_rate_limits(self, client_ip, path):
        """Check rate limits for non-login endpoints"""
        threats = []
        
        # Check API request rate
        cache_key = f"api_requests_{client_ip}"
        requests = cache.get(cache_key, 0)
        if requests >= self.rate_limits['api_requests']['max']:
            threats.append({
                'type': 'rate_limit_exceeded',
                'limit_type': 'api_requests',
                'current': requests,
                'max': self.rate_limits['api_requests']['max']
            })
        else:
            cache.set(cache_key, requests + 1, self.rate_limits['api_requests']['window'])
        
        # Check admin access rate
        if 'admin' in path:
            cache_key = f"admin_access_{client_ip}"
            attempts = cache.get(cache_key, 0)
            if attempts >= self.rate_limits['admin_access']['max']:
                threats.append({
                    'type': 'rate_limit_exceeded',
                    'limit_type': 'admin_access',
                    'current': attempts,
                    'max': self.rate_limits['admin_access']['max']
                })
            else:
                cache.set(cache_key, attempts + 1, self.rate_limits['admin_access']['window'])
        
        return threats
    
    def determine_threat_level(self, threats):
        """Determine overall threat level"""
        if not threats:
            return 'LOW'
        
        critical_types = {'token_reuse_different_ip', 'admin_access_attempt'}
        high_types = {'sql_injection', 'command_injection', 'xss_attack'}
        medium_types = {'path_traversal', 'weird_upload', 'rate_limit_exceeded'}
        
        threat_types = {threat['type'] for threat in threats}
        
        if any(t in critical_types for t in threat_types):
            return 'CRITICAL'
        elif any(t in high_types for t in threat_types):
            return 'HIGH'
        elif any(t in medium_types for t in threat_types):
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def send_security_notification(self, threats, client_ip, path, user):
        """Send security notification to superusers"""
        logger.info(f"🔍 IDS: Attempting to send security notification for {len(threats)} threats from {client_ip}")
        try:
            # Get all superusers
            superusers = User.objects.filter(is_superuser=True)
            
            if not superusers.exists():
                logger.warning("🔍 IDS: No superusers found to send notification to")
                return
            
            # Create notification message
            threat_types = [threat['type'] for threat in threats]
            threat_level = self.determine_threat_level(threats)
            
            title = f"🚨 Security Alert - {threat_level.upper()}"
            message = f"Security threats detected from IP {client_ip} on path {path}"
            
            if user and not user.is_anonymous:
                message += f" by user {user.email}"
            else:
                message += " by anonymous user"
            
            message += f"\n\nThreats detected: {', '.join(threat_types)}"
            
            # Add details for critical threats
            if threat_level == 'CRITICAL':
                message += "\n\n⚠️ CRITICAL: Immediate attention required!"
            
            # Send notification to each superuser
            for superuser in superusers:
                from account.services.notification_service import NotificationService
                
                logger.info(f"🔍 IDS: Creating notification for superuser {superuser.email}")
                notification = NotificationService.create_notification(
                    recipient=superuser,
                    notification_type='security_alert',
                    title=title,
                    message=message,
                    priority='high' if threat_level in ['HIGH', 'CRITICAL'] else 'normal',
                    extra_data={
                        'threats': threats,
                        'client_ip': client_ip,
                        'path': path,
                        'threat_level': threat_level,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                if notification:
                    logger.info(f"🔍 IDS: Successfully created notification {notification.id}")
                else:
                    logger.warning(f"🔍 IDS: Failed to create notification for {superuser.email}")
            
            # Also log to UserActionLog for admin panel visibility
            UserActionLog.objects.create(
                user=user if user and not user.is_anonymous else None,
                action_type='SECURITY_THREAT_DETECTED',
                target_model='Security',
                target_id=None,
                description=title,
                additional_data=json.dumps({
                    'threats': threats,
                    'client_ip': client_ip,
                    'path': path,
                    'threat_level': threat_level,
                    'timestamp': timezone.now().isoformat()
                })
            )
                
        except Exception as e:
            logger.error(f"Failed to send security notification: {e}")
    
    def extract_request_data(self, request):
        """Extract and sanitize request data"""
        data = {}
        
        # GET parameters
        data.update(request.GET.dict())
        
        # POST parameters
        if request.method == 'POST':
            data.update(request.POST.dict())
        
        # JSON data
        if request.content_type == 'application/json':
            try:
                json_data = json.loads(request.body.decode('utf-8'))
                if isinstance(json_data, dict):
                    data.update(json_data)
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        
        return data
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

# Create singleton instance
lightweight_ids = LightweightIDS() 