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


class IPAuditView(APIView):
    """
    Audit security events for a specific IP address
    """
    permission_classes = [IsAuthenticated, IsSuperuser]
    
    def get(self, request, ip_address):
        """Get all security events for a specific IP address with pagination"""
        try:
            # Validate IP address format
            import ipaddress
            try:
                ipaddress.ip_address(ip_address)
            except ValueError:
                return Response({
                    'error': 'Invalid IP address format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get pagination parameters
            try:
                page = int(request.GET.get('page', 1))
                if page < 1:
                    page = 1
            except (ValueError, TypeError):
                page = 1
                
            page_size = 50  # Fixed page size of 50
            offset = (page - 1) * page_size
            
            # Get all security events for this IP address
            security_events = UserActionLog.objects.filter(
                action_type__in=[
                    'SECURITY_ALERT', 
                    'SECURITY_THREAT_DETECTED', 
                    'SECURITY_IP_BANNED', 
                    'SECURITY_IP_UNBANNED', 
                    'SECURITY_IP_WHITELISTED',
                    'LOGIN_ATTEMPT',
                    'LOGIN_SUCCESS',
                    'LOGIN_FAILED',
                    'LOGOUT'
                ]
            ).order_by('-created_at')
            
            # Filter events by IP address in additional_data
            matching_events = []
            for event in security_events:
                try:
                    additional_data = json.loads(event.additional_data) if event.additional_data else {}
                    event_ip = additional_data.get('client_ip') or additional_data.get('ip_address')
                    
                    if event_ip == ip_address:
                        # Format date in European format (dd/mm/yyyy HH:MM:SS)
                        formatted_date = event.created_at.strftime("%d/%m/%Y %H:%M:%S")
                        
                        matching_events.append({
                            'id': event.id,
                            'timestamp': event.created_at.isoformat(),
                            'formatted_date': formatted_date,  # European format
                            'title': event.description,
                            'threat_level': additional_data.get('threat_level', 'INFO'),
                            'action_type': event.action_type,
                            'path': additional_data.get('path', ''),
                            'method': additional_data.get('method', ''),
                            'user_agent': additional_data.get('user_agent', ''),
                            'threats': additional_data.get('threats', []),
                            'description': additional_data.get('description', event.description),
                            'user': event.user.email if event.user else 'System',
                            'user_full_name': f"{event.user.firstname} {event.user.lastname}" if event.user else 'System',
                            'user_id': event.user.id if event.user else None,
                            'additional_info': {
                                'target_model': event.target_model,
                                'target_id': event.target_id,
                                'session_id': additional_data.get('session_id'),
                                'blocked_by': additional_data.get('blocked_by') or additional_data.get('banned_by'),
                                'reason': additional_data.get('reason')
                            }
                        })
                except (json.JSONDecodeError, TypeError):
                    # Skip events with malformed additional_data
                    continue
            
            # Sort by timestamp (most recent first)
            matching_events.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Apply pagination
            total_events = len(matching_events)
            total_pages = (total_events + page_size - 1) // page_size  # Ceiling division
            paginated_events = matching_events[offset:offset + page_size]
            
            # Get current IP status (banned, whitelisted, etc.)
            ip_status = {
                'blocked': cache.get(f"blocked_ip_{ip_address}") is not None,
                'whitelisted': cache.get(f"whitelisted_ip_{ip_address}") is not None,
                'blocked_info': cache.get(f"blocked_ip_{ip_address}"),
                'whitelisted_info': cache.get(f"whitelisted_ip_{ip_address}")
            }
            
            # Security summary for this IP
            summary = {
                'total_events': total_events,
                'threat_levels': {},
                'action_types': {},
                'date_range': {
                    'first_seen': matching_events[-1]['formatted_date'] if matching_events else None,
                    'last_seen': matching_events[0]['formatted_date'] if matching_events else None
                }
            }
            
            # Count threat levels and action types (from all events, not just current page)
            for event in matching_events:
                level = event['threat_level']
                summary['threat_levels'][level] = summary['threat_levels'].get(level, 0) + 1
                
                action = event['action_type']
                summary['action_types'][action] = summary['action_types'].get(action, 0) + 1
            
            return Response({
                'ip_address': ip_address,
                'events': paginated_events,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'page_size': page_size,
                    'total_events': total_events,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                    'next_page': page + 1 if page < total_pages else None,
                    'previous_page': page - 1 if page > 1 else None
                },
                'summary': summary,
                'ip_status': ip_status,
                'total_found': total_events
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to retrieve IP audit data: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 