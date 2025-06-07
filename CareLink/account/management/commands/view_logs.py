from django.core.management.base import BaseCommand
from django.conf import settings
import os
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'View and analyze CareLink log files'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--log-type',
            choices=['admin', 'error', 'general'],
            default='general',
            help='Type of log to view'
        )
        parser.add_argument(
            '--lines',
            type=int,
            default=50,
            help='Number of lines to show (default: 50)'
        )
        parser.add_argument(
            '--filter',
            type=str,
            help='Filter logs containing this text'
        )
        parser.add_argument(
            '--since',
            type=str,
            help='Show logs since date (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--errors-only',
            action='store_true',
            help='Show only error-level logs'
        )
    
    def handle(self, *args, **options):
        log_type = options['log_type']
        lines = options['lines']
        filter_text = options['filter']
        since_date = options['since']
        errors_only = options['errors_only']
        
        # Determine log file path
        log_files = {
            'admin': settings.BASE_DIR / 'logs' / 'admin.log',
            'error': settings.BASE_DIR / 'logs' / 'errors.log',
            'general': settings.BASE_DIR / 'logs' / 'carelink.log'
        }
        
        log_file = log_files.get(log_type)
        
        if not os.path.exists(log_file):
            self.stdout.write(self.style.ERROR(f'Log file not found: {log_file}'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Reading {log_type} logs from: {log_file}'))
        self.stdout.write('='*80)
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()
            
            # Apply filters
            filtered_lines = self.filter_logs(log_lines, filter_text, since_date, errors_only)
            
            # Show last N lines
            display_lines = filtered_lines[-lines:] if len(filtered_lines) > lines else filtered_lines
            
            if not display_lines:
                self.stdout.write(self.style.WARNING('No log entries match the specified criteria.'))
                return
            
            # Display logs with formatting
            for line in display_lines:
                formatted_line = self.format_log_line(line.strip())
                self.stdout.write(formatted_line)
            
            self.stdout.write('='*80)
            self.stdout.write(f'Showing {len(display_lines)} of {len(filtered_lines)} total matching entries')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading log file: {str(e)}'))
    
    def filter_logs(self, log_lines, filter_text, since_date, errors_only):
        """Filter log lines based on criteria"""
        filtered = log_lines
        
        # Filter by date if specified
        if since_date:
            try:
                since_dt = datetime.strptime(since_date, '%Y-%m-%d')
                filtered = [line for line in filtered if self.line_after_date(line, since_dt)]
            except ValueError:
                self.stdout.write(self.style.ERROR('Invalid date format. Use YYYY-MM-DD'))
                return []
        
        # Filter by text if specified
        if filter_text:
            filtered = [line for line in filtered if filter_text.lower() in line.lower()]
        
        # Filter errors only if specified
        if errors_only:
            error_keywords = ['ERROR', 'CRITICAL', 'FATAL']
            filtered = [line for line in filtered if any(keyword in line.upper() for keyword in error_keywords)]
        
        return filtered
    
    def line_after_date(self, line, since_date):
        """Check if log line is after the specified date"""
        try:
            # Try to extract date from log line (assuming standard format)
            # This is a simplified approach - adjust based on your log format
            parts = line.split()
            if len(parts) >= 2:
                date_str = f"{parts[0]} {parts[1]}"
                # Try different date formats
                for fmt in ['%Y-%m-%d %H:%M:%S,%f', '%Y-%m-%d %H:%M:%S']:
                    try:
                        log_date = datetime.strptime(date_str, fmt)
                        return log_date >= since_date
                    except ValueError:
                        continue
        except:
            pass
        return True  # Include line if we can't parse the date
    
    def format_log_line(self, line):
        """Format log line with colors based on log level"""
        if 'ERROR' in line.upper() or 'CRITICAL' in line.upper():
            return self.style.ERROR(line)
        elif 'WARNING' in line.upper():
            return self.style.WARNING(line)
        elif 'INFO' in line.upper():
            return self.style.SUCCESS(line)
        elif 'DEBUG' in line.upper():
            return self.style.HTTP_INFO(line)
        else:
            return line
