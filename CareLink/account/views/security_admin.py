from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import UserActionLog
from ..services.lightweight_ids import lightweight_ids
import json

class IsSuperuser(BasePermission):
    """
    Custom permission to only allow superusers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class SecurityNotificationsView(APIView):
    """
    View security notifications for superusers
    """
    permission_classes = [IsAuthenticated, IsSuperuser]
    
    def get(self, request):
        """Get security notifications"""
        try:
            # Get recent security notifications
            hours = int(request.GET.get('hours', 24))
            cutoff_time = timezone.now() - timedelta(hours=hours)
            
            # Get security-related notifications
            security_events = UserActionLog.objects.filter(
                action_type__in=['SECURITY_ALERT', 'SECURITY_THREAT_DETECTED', 'SECURITY_IP_BANNED', 'SECURITY_IP_UNBANNED', 'SECURITY_IP_WHITELISTED'],
                created_at__gte=cutoff_time
            ).order_by('-created_at')[:50]
            
            notifications = []
            for event in security_events:
                try:
                    additional_data = json.loads(event.additional_data) if event.additional_data else {}
                except (json.JSONDecodeError, TypeError):
                    additional_data = {}
                
                notifications.append({
                    'id': event.id,
                    'timestamp': event.created_at.isoformat(),
                    'title': event.description,
                    'threat_level': additional_data.get('threat_level', 'UNKNOWN'),
                    'client_ip': additional_data.get('client_ip', 'Unknown'),
                    'path': additional_data.get('path', ''),
                    'threats': additional_data.get('threats', []),
                    'user': event.user.email if event.user else 'System'
                })
            
            return Response({
                'notifications': notifications,
                'total': len(notifications),
                'hours': hours
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to retrieve security notifications: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SecurityActionsView(APIView):
    """
    Take security actions (ban IP, whitelist, etc.)
    """
    permission_classes = [IsAuthenticated, IsSuperuser]
    
    def post(self, request):
        """Take security action"""
        try:
            action = request.data.get('action')
            ip_address = request.data.get('ip_address')
            reason = request.data.get('reason', 'Manual action by administrator')
            
            if not action or not ip_address:
                return Response({
                    'error': 'Action and IP address are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if action == 'ban_ip':
                # Add IP to blocked list (you can implement this in lightweight_ids)
                cache.set(f"blocked_ip_{ip_address}", {
                    'blocked_by': request.user.email,
                    'reason': reason,
                    'timestamp': timezone.now().isoformat()
                }, 86400 * 30)  # Block for 30 days
                
                # Log the action
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='SECURITY_IP_BANNED',
                    target_model='Security',
                    target_id=None,
                    description=f"IP {ip_address} banned by {request.user.email}",
                    additional_data=json.dumps({
                        'ip_address': ip_address,
                        'reason': reason,
                        'banned_by': request.user.email,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': f'IP {ip_address} has been banned',
                    'ip_address': ip_address,
                    'action': 'banned'
                })
            
            elif action == 'unban_ip':
                # Remove IP from blocked list
                cache.delete(f"blocked_ip_{ip_address}")
                
                # Log the action
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='SECURITY_IP_UNBANNED',
                    target_model='Security',
                    target_id=None,
                    description=f"IP {ip_address} unbanned by {request.user.email}",
                    additional_data=json.dumps({
                        'ip_address': ip_address,
                        'unbanned_by': request.user.email,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': f'IP {ip_address} has been unbanned',
                    'ip_address': ip_address,
                    'action': 'unbanned'
                })
            
            elif action == 'whitelist_ip':
                # Add IP to whitelist
                cache.set(f"whitelisted_ip_{ip_address}", {
                    'whitelisted_by': request.user.email,
                    'reason': reason,
                    'timestamp': timezone.now().isoformat()
                }, 86400 * 365)  # Whitelist for 1 year
                
                # Log the action
                UserActionLog.objects.create(
                    user=request.user,
                    action_type='SECURITY_IP_WHITELISTED',
                    target_model='Security',
                    target_id=None,
                    description=f"IP {ip_address} whitelisted by {request.user.email}",
                    additional_data=json.dumps({
                        'ip_address': ip_address,
                        'reason': reason,
                        'whitelisted_by': request.user.email,
                        'timestamp': timezone.now().isoformat()
                    })
                )
                
                return Response({
                    'message': f'IP {ip_address} has been whitelisted',
                    'ip_address': ip_address,
                    'action': 'whitelisted'
                })
            
            else:
                return Response({
                    'error': f'Unknown action: {action}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': f'Failed to perform security action: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SecurityStatsView(APIView):
    """
    Get security statistics
    """
    permission_classes = [IsAuthenticated, IsSuperuser]
    
    def get(self, request):
        """Get security statistics"""
        try:
            hours = int(request.GET.get('hours', 24))
            cutoff_time = timezone.now() - timedelta(hours=hours)
            
            # Get security event statistics
            security_events = UserActionLog.objects.filter(
                action_type__in=['SECURITY_ALERT', 'SECURITY_THREAT_DETECTED', 'SECURITY_IP_BANNED', 'SECURITY_IP_UNBANNED', 'SECURITY_IP_WHITELISTED'],
                created_at__gte=cutoff_time
            )
            
            # Count by threat level
            threat_levels = {}
            threat_types = {}
            ips = {}
            
            for event in security_events:
                try:
                    additional_data = json.loads(event.additional_data) if event.additional_data else {}
                except (json.JSONDecodeError, TypeError):
                    additional_data = {}
                
                level = additional_data.get('threat_level', 'UNKNOWN')
                threat_levels[level] = threat_levels.get(level, 0) + 1
                
                client_ip = additional_data.get('client_ip', 'Unknown')
                ips[client_ip] = ips.get(client_ip, 0) + 1
                
                threats = additional_data.get('threats', [])
                for threat in threats:
                    threat_type = threat.get('type', 'unknown')
                    threat_types[threat_type] = threat_types.get(threat_type, 0) + 1
            
            return Response({
                'total_events': security_events.count(),
                'by_threat_level': threat_levels,
                'by_threat_type': threat_types,
                'by_ip': ips,
                'hours': hours
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to retrieve security statistics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 