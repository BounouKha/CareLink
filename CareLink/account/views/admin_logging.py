"""
Admin Logging Dashboard
Provides comprehensive logging monitoring for administrators
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import user_passes_test
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
from datetime import datetime, timedelta
from ..logging_config import get_recent_logs, get_security_alerts, get_user_activity, get_ticket_activity

def is_admin(user):
    """Check if user is admin or superuser"""
    return user.is_superuser or user.is_staff or user.role in ['Administrator', 'Administrative']

@method_decorator(user_passes_test(is_admin), name='dispatch')
class AdminLoggingDashboardView(APIView):
    """
    Admin Logging Dashboard API
    Provides comprehensive logging monitoring for administrators
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get logging dashboard data"""
        try:
            # Get query parameters
            category = request.GET.get('category', 'all')
            hours = int(request.GET.get('hours', 24))
            
            # Get logs based on category
            if category == 'security':
                logs = get_security_alerts()
            elif category == 'user_activity':
                logs = get_user_activity()
            elif category == 'tickets':
                logs = get_ticket_activity()
            else:
                logs = get_recent_logs(category, hours)
            
            # Parse logs for better display
            parsed_logs = []
            for log in logs:
                try:
                    # Extract timestamp and message
                    if log.startswith('['):
                        timestamp_end = log.find(']')
                        if timestamp_end > 0:
                            timestamp = log[1:timestamp_end]
                            message = log[timestamp_end + 2:]
                            
                            # Determine log level
                            level = 'INFO'
                            if 'ERROR' in log:
                                level = 'ERROR'
                            elif 'WARNING' in log:
                                level = 'WARNING'
                            elif 'CRITICAL' in log:
                                level = 'CRITICAL'
                            
                            parsed_logs.append({
                                'timestamp': timestamp,
                                'level': level,
                                'message': message,
                                'raw': log
                            })
                        else:
                            parsed_logs.append({
                                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'level': 'INFO',
                                'message': log,
                                'raw': log
                            })
                    else:
                        parsed_logs.append({
                            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'level': 'INFO',
                            'message': log,
                            'raw': log
                        })
                except Exception as e:
                    # If parsing fails, include the raw log
                    parsed_logs.append({
                        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'level': 'ERROR',
                        'message': f'Log parsing error: {str(e)}',
                        'raw': log
                    })
            
            # Get summary statistics
            summary = self.get_summary_statistics(parsed_logs)
            
            return Response({
                'success': True,
                'data': {
                    'logs': parsed_logs,
                    'summary': summary,
                    'category': category,
                    'hours': hours,
                    'total_logs': len(parsed_logs)
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_summary_statistics(self, logs):
        """Generate summary statistics from logs"""
        summary = {
            'total_logs': len(logs),
            'error_count': 0,
            'warning_count': 0,
            'info_count': 0,
            'login_count': 0,
            'logout_count': 0,
            'ticket_count': 0,
            'comment_count': 0,
            'security_count': 0,
        }
        
        for log in logs:
            message = log.get('message', '').upper()
            level = log.get('level', 'INFO')
            
            # Count by level
            if level == 'ERROR':
                summary['error_count'] += 1
            elif level == 'WARNING':
                summary['warning_count'] += 1
            else:
                summary['info_count'] += 1
            
            # Count by category
            if 'LOGIN' in message:
                summary['login_count'] += 1
            if 'LOGOUT' in message:
                summary['logout_count'] += 1
            if 'TICKET' in message:
                summary['ticket_count'] += 1
            if 'COMMENT' in message:
                summary['comment_count'] += 1
            if 'SECURITY' in message or 'UNAUTHORIZED' in message:
                summary['security_count'] += 1
        
        return summary

@csrf_exempt
@require_http_methods(["GET"])
def admin_logging_dashboard(request):
    """Admin logging dashboard view for web interface"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    if not is_admin(request.user):
        return JsonResponse({'error': 'Admin access required'}, status=403)
    
    try:
        # Get logs
        logs = get_recent_logs('all', 24)
        
        # Create HTML response
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>CareLink Admin Logging Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .log-entry {{ 
                    border: 1px solid #ddd; 
                    margin: 5px 0; 
                    padding: 10px; 
                    border-radius: 3px;
                    font-family: monospace;
                    font-size: 12px;
                }}
                .error {{ background: #ffe6e6; border-left: 4px solid #ff0000; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; }}
                .info {{ background: #e7f3ff; border-left: 4px solid #007bff; }}
                .controls {{ margin: 20px 0; }}
                .summary {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>CareLink Admin Logging Dashboard</h1>
                <p>Welcome, {request.user.firstname} {request.user.lastname} ({request.user.role})</p>
                <p>Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="controls">
                <button onclick="location.reload()">Refresh</button>
                <button onclick="window.location.href='/admin/'">Admin Panel</button>
            </div>
            
            <div class="summary">
                <h3>Summary (Last 24 Hours)</h3>
                <p>Total Logs: {len(logs)}</p>
                <p>Login Events: {len([l for l in logs if 'LOGIN' in l])}</p>
                <p>Logout Events: {len([l for l in logs if 'LOGOUT' in l])}</p>
                <p>Ticket Events: {len([l for l in logs if 'TICKET' in l])}</p>
                <p>Security Events: {len([l for l in logs if 'SECURITY' in l or 'UNAUTHORIZED' in l])}</p>
            </div>
            
            <h3>Recent Logs</h3>
            <div id="logs">
        """
        
        # Add log entries
        for log in logs[-50:]:  # Show last 50 logs
            css_class = 'info'
            if 'ERROR' in log:
                css_class = 'error'
            elif 'WARNING' in log:
                css_class = 'warning'
            
            html_content += f'<div class="log-entry {css_class}">{log}</div>'
        
        html_content += """
            </div>
        </body>
        </html>
        """
        
        return JsonResponse({'html': html_content})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500) 