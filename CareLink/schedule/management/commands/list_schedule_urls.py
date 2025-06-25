"""
Django management command to list all URL patterns and find schedule-related endpoints.

Usage: python manage.py list_schedule_urls
"""

from django.core.management.base import BaseCommand
from django.urls import get_resolver
from django.conf import settings
import re


class Command(BaseCommand):
    help = 'List all URL patterns to find schedule-related endpoints'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔍 Finding schedule-related URL patterns...'))
        
        resolver = get_resolver()
        
        schedule_urls = []
        all_urls = []
        
        def extract_patterns(urlpatterns, prefix=''):
            for pattern in urlpatterns:
                if hasattr(pattern, 'url_patterns'):
                    # This is an include() pattern
                    new_prefix = prefix + str(pattern.pattern)
                    extract_patterns(pattern.url_patterns, new_prefix)
                else:
                    # This is a regular pattern
                    full_pattern = prefix + str(pattern.pattern)
                    view_name = getattr(pattern.callback, '__name__', str(pattern.callback))
                    
                    all_urls.append((full_pattern, view_name))
                    
                    # Check if it's schedule-related
                    if any(keyword in full_pattern.lower() or keyword in view_name.lower() 
                           for keyword in ['schedule', 'timeslot', 'appointment', 'calendar']):
                        schedule_urls.append((full_pattern, view_name))
        
        extract_patterns(resolver.url_patterns)
        
        self.stdout.write(f'\n📋 SCHEDULE-RELATED ENDPOINTS:')
        self.stdout.write('=' * 40)
        
        if schedule_urls:
            for pattern, view_name in schedule_urls:
                self.stdout.write(f'🔗 {pattern} → {view_name}')
        else:
            self.stdout.write(self.style.WARNING('❌ No schedule-related endpoints found'))
        
        self.stdout.write(f'\n📊 SUMMARY:')
        self.stdout.write(f'Total URLs: {len(all_urls)}')
        self.stdout.write(f'Schedule-related URLs: {len(schedule_urls)}')
        
        # Show some common API patterns
        api_urls = [url for url in all_urls if 'api' in url[0].lower()]
        if api_urls:
            self.stdout.write(f'\n🌐 API ENDPOINTS (first 10):')
            self.stdout.write('-' * 25)
            for pattern, view_name in api_urls[:10]:
                self.stdout.write(f'🔗 {pattern} → {view_name}')
        
        self.stdout.write(f'\n💡 NEXT STEPS:')
        self.stdout.write('=' * 15)
        self.stdout.write('1. Check which of these URLs your frontend is calling')
        self.stdout.write('2. Test these endpoints directly in browser/Postman')
        self.stdout.write('3. Compare with the simulated JSON data we generated')
        self.stdout.write('4. Use browser dev tools Network tab to see actual requests')
