"""
Frontend Security Alert Views
Handles security alerts sent from the React frontend
"""

import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json

from account.services.notification_service import NotificationService
from django.contrib.auth import get_user_model

logger = logging.getLogger('carelink.security')
User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anonymous users to report intrusion attempts
def frontend_intrusion_alert(request):
    """
    Handle security alerts from the React frontend
    """
    try:
        data = request.data
        
        # Get client information
        client_ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        
        # Extract alert data
        alert_type = data.get('alert_type', 'unknown')
        path = data.get('path', 'unknown')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        referrer = data.get('referrer', 'direct')
        
        # Determine user info
        user_info = "anonymous user"
        if request.user and request.user.is_authenticated:
            user_info = f"user {request.user.email} (ID: {request.user.id})"
        
        # Log the security event
        logger.warning(
            f"🚨 Frontend Security Alert - Type: {alert_type} - "
            f"Path: {path} - IP: {client_ip} - User: {user_info} - "
            f"User-Agent: {user_agent[:100]}"
        )
        
        # Send notification to superusers
        send_frontend_security_notification(
            alert_type=alert_type,
            path=path,
            client_ip=client_ip,
            user_info=user_info,
            user_agent=user_agent,
            referrer=referrer,
            timestamp=timestamp
        )
        
        return Response({
            'status': 'success',
            'message': 'Security alert received and processed'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error processing frontend security alert: {e}")
        return Response({
            'status': 'error',
            'message': 'Failed to process security alert'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_frontend_security_notification(alert_type, path, client_ip, user_info, user_agent, referrer, timestamp):
    """
    Send security notification to superusers for frontend alerts
    """
    try:
        # Get all superusers
        superusers = User.objects.filter(is_superuser=True)
        
        if not superusers.exists():
            logger.warning("🔍 Frontend Security: No superusers found to send notification to")
            return
        
        # Create notification message
        title = "🚨 Frontend Security Alert - Unauthorized Admin Access"
        
        message = f"Unauthorized admin access attempt detected in frontend\n\n"
        message += f"🌐 Path: {path}\n"
        message += f"📍 IP Address: {client_ip}\n"
        message += f"👤 User: {user_info}\n"
        message += f"🕒 Time: {timestamp}\n"
        message += f"🔗 Referrer: {referrer}\n"
        message += f"🖥️ User Agent: {user_agent[:200]}...\n\n"
        message += f"⚠️ This indicates someone attempted to access admin functionality "
        message += f"without proper authorization."
        
        # Send notification to each superuser
        for superuser in superusers:
            logger.info(f"🔍 Frontend Security: Creating notification for superuser {superuser.email}")
            
            notification = NotificationService.create_notification(
                recipient=superuser,
                notification_type='frontend_security_alert',
                title=title,
                message=message,
                priority='high',
                extra_data={
                    'alert_type': alert_type,
                    'path': path,
                    'client_ip': client_ip,
                    'user_agent': user_agent,
                    'referrer': referrer,
                    'timestamp': timestamp,
                    'threat_level': 'MEDIUM'
                }
            )
            
            logger.info(f"✅ Frontend security notification sent to {superuser.email}")
            
    except Exception as e:
        logger.error(f"Error sending frontend security notification: {e}")


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
