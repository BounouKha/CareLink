from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.conf import settings
from CareLink.models import UserActionLog
from django.utils import timezone
from datetime import datetime, timedelta
import os
import re

class LogsView(APIView):
    """
    API endpoint for viewing system logs and user action logs
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only superusers can view logs
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        # Get query parameters
        log_type = request.query_params.get('type', 'user_actions')  # user_actions, admin, errors, general
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        search = request.query_params.get('search', '')
        since_date = request.query_params.get('since_date', '')
        action_type = request.query_params.get('action_type', '')

        if log_type == 'user_actions':
            return self.get_user_action_logs(page, page_size, search, since_date, action_type)
        else:
            return self.get_file_logs(log_type, page, page_size, search, since_date)

    def get_user_action_logs(self, page, page_size, search, since_date, action_type):
        """Get user action logs from database"""
        try:
            # Start with all logs
            queryset = UserActionLog.objects.all().order_by('-created_at')

            # Apply filters
            if search:
                queryset = queryset.filter(
                    user__firstname__icontains=search
                ) or queryset.filter(
                    user__lastname__icontains=search
                ) or queryset.filter(
                    action_type__icontains=search
                ) or queryset.filter(
                    target_model__icontains=search
                )

            if since_date:
                try:
                    since_dt = datetime.strptime(since_date, '%Y-%m-%d')
                    queryset = queryset.filter(created_at__gte=since_dt)
                except ValueError:
                    pass

            if action_type:
                queryset = queryset.filter(action_type__icontains=action_type)

            # Paginate
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)            # Format the logs
            logs = []
            for log in page_obj:
                # Build enhanced description with patient/provider info
                enhanced_description = log.description or f"{log.action_type} on {log.target_model} (ID: {log.target_id})" if log.target_model else log.action_type
                
                # Add patient/provider info to description if available
                context_parts = []
                if log.affected_patient_name:
                    context_parts.append(f"Patient: {log.affected_patient_name}")
                if log.affected_provider_name:
                    context_parts.append(f"Provider: {log.affected_provider_name}")
                
                if context_parts:
                    enhanced_description += f" - {', '.join(context_parts)}"
                
                logs.append({
                    'id': log.id,
                    'user': f"{log.user.firstname} {log.user.lastname}" if log.user else "System",
                    'user_name': f"{log.user.firstname} {log.user.lastname}" if log.user else "System",
                    'user_email': log.user.email if log.user else "",
                    'action_type': log.action_type,
                    'target_model': log.target_model,
                    'target_id': log.target_id,
                    'created_at': log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'description': enhanced_description,
                    'details': enhanced_description,
                    # Enhanced fields
                    'affected_patient_id': log.affected_patient_id,
                    'affected_patient_name': log.affected_patient_name,
                    'affected_provider_id': log.affected_provider_id,
                    'affected_provider_name': log.affected_provider_name,
                    'additional_data': log.additional_data
                })

            return Response({
                'logs': logs,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous()
                },
                'log_type': 'user_actions'
            })

        except Exception as e:
            return Response({'error': f'Failed to fetch user action logs: {str(e)}'}, status=500)

    def get_file_logs(self, log_type, page, page_size, search, since_date):
        """Get logs from log files"""
        try:
            # Determine log file path
            log_files = {
                'admin': settings.BASE_DIR / 'logs' / 'admin.log',
                'errors': settings.BASE_DIR / 'logs' / 'errors.log',
                'general': settings.BASE_DIR / 'logs' / 'carelink.log'
            }

            log_file = log_files.get(log_type)
            if not log_file or not os.path.exists(log_file):
                return Response({'error': f'Log file not found: {log_type}'}, status=404)

            # Read log file
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()

            # Parse and filter logs
            parsed_logs = []
            for i, line in enumerate(log_lines):
                line = line.strip()
                if not line:
                    continue

                # Parse log line (simplified parsing)
                log_entry = self.parse_log_line(line, i + 1)
                
                # Apply filters
                if search and search.lower() not in line.lower():
                    continue

                if since_date:
                    try:
                        since_dt = datetime.strptime(since_date, '%Y-%m-%d')
                        if log_entry['timestamp'] and log_entry['timestamp'] < since_dt:
                            continue
                    except (ValueError, TypeError):
                        pass

                parsed_logs.append(log_entry)

            # Reverse to show newest first
            parsed_logs.reverse()

            # Paginate
            paginator = Paginator(parsed_logs, page_size)
            page_obj = paginator.get_page(page)

            return Response({
                'logs': list(page_obj),
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous()
                },
                'log_type': log_type
            })

        except Exception as e:
            return Response({'error': f'Failed to read log file: {str(e)}'}, status=500)

    def parse_log_line(self, line, line_number):
        """Parse a log line into structured data"""
        try:
            # Try to extract timestamp, level, and message
            # Format: YYYY-MM-DD HH:MM:SS,mmm level module - message
            timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', line)
            level_match = re.search(r'\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+', line)
            
            timestamp = None
            if timestamp_match:
                try:
                    timestamp = datetime.strptime(timestamp_match.group(1), '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    pass

            level = level_match.group(1) if level_match else 'UNKNOWN'
            
            return {
                'line_number': line_number,
                'timestamp': timestamp,
                'timestamp_str': timestamp.strftime('%Y-%m-%d %H:%M:%S') if timestamp else '',
                'level': level,
                'message': line,
                'raw_line': line
            }
        except Exception:
            return {
                'line_number': line_number,
                'timestamp': None,
                'timestamp_str': '',
                'level': 'UNKNOWN',
                'message': line,
                'raw_line': line
            }


class LogStatsView(APIView):
    """
    API endpoint for log statistics
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        try:
            # Get date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=7)  # Last 7 days

            # User action stats
            user_actions = UserActionLog.objects.filter(
                created_at__gte=start_date
            )

            stats = {
                'user_actions': {
                    'total': user_actions.count(),
                    'by_type': {},
                    'by_user': {},
                    'recent_activity': []
                },
                'log_files': {},
                'time_range': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': end_date.strftime('%Y-%m-%d')
                }
            }            # Group by action type
            action_types = list(user_actions.values_list('action_type', flat=True))
            for action_type in set(action_types):
                if action_type:
                    stats['user_actions']['by_type'][action_type] = action_types.count(action_type)

            # Group by user
            for action in user_actions.select_related('user')[:10]:
                user_key = f"{action.user.firstname} {action.user.lastname}" if action.user else "System"
                if user_key not in stats['user_actions']['by_user']:
                    stats['user_actions']['by_user'][user_key] = 0
                stats['user_actions']['by_user'][user_key] += 1

            # Recent activity
            recent_actions = user_actions.order_by('-created_at')[:5]
            for action in recent_actions:
                stats['user_actions']['recent_activity'].append({
                    'user': f"{action.user.firstname} {action.user.lastname}" if action.user else "System",
                    'action': action.action_type,
                    'target': action.target_model,
                    'time': action.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })

            # Log file stats
            log_files = {
                'admin': settings.BASE_DIR / 'logs' / 'admin.log',
                'errors': settings.BASE_DIR / 'logs' / 'errors.log',
                'general': settings.BASE_DIR / 'logs' / 'carelink.log'
            }

            for log_type, log_file in log_files.items():
                if os.path.exists(log_file):
                    try:
                        file_stats = os.stat(log_file)
                        with open(log_file, 'r', encoding='utf-8') as f:
                            line_count = sum(1 for _ in f)
                        
                        stats['log_files'][log_type] = {
                            'exists': True,
                            'size_mb': round(file_stats.st_size / (1024 * 1024), 2),
                            'line_count': line_count,
                            'last_modified': datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                        }
                    except Exception as e:
                        stats['log_files'][log_type] = {
                            'exists': True,
                            'error': str(e)
                        }
                else:
                    stats['log_files'][log_type] = {'exists': False}

            return Response(stats)

        except Exception as e:
            return Response({'error': f'Failed to generate log stats: {str(e)}'}, status=500)
