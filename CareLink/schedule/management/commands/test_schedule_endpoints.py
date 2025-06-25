"""
Django management command to test specific schedule endpoints and their responses.

Usage: python manage.py test_schedule_endpoints
"""

from django.core.management.base import BaseCommand
from django.test import Client
from CareLink.models import User
from django.urls import reverse
from datetime import datetime, timedelta
import json


class Command(BaseCommand):
    help = 'Test schedule endpoints to see what data they return'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='admin',
            help='Username to authenticate with'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🧪 Testing Schedule Endpoints...'))
        
        # Create a test client
        client = Client()
        
        # Try to get a user for authentication
        try:
            user = User.objects.get(username=options['email'])
            client.force_login(user)
            self.stdout.write(f'✅ Authenticated as: {user.email}')
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING(f'⚠️  User "{options["email"]}" not found. Testing without authentication.'))
        
        # Define endpoints to test
        endpoints_to_test = [
            '/schedule/calendar/',
            '/schedule/patient/schedule/',
            '/schedule/family/schedule/',
            '/schedule/availability/',
        ]
        
        # Test each endpoint
        for endpoint in endpoints_to_test:
            self.stdout.write(f'\n🔍 Testing endpoint: {endpoint}')
            self.stdout.write('-' * 50)
            
            try:
                # Add date parameters for the week we're testing
                params = {
                    'start_date': '2025-06-29',
                    'end_date': '2025-07-05',
                    'week_start': '2025-06-29',
                    'week_end': '2025-07-05',
                }
                
                # Test GET request
                response = client.get(endpoint, params)
                
                self.stdout.write(f'📊 Status Code: {response.status_code}')
                
                if response.status_code == 200:
                    # Check content type
                    content_type = response.get('Content-Type', '')
                    self.stdout.write(f'📋 Content-Type: {content_type}')
                    
                    if 'json' in content_type.lower():
                        # It's JSON - parse and analyze
                        try:
                            data = response.json()
                            self.stdout.write(f'📦 JSON Response Type: {type(data)}')
                            
                            if isinstance(data, dict):
                                self.stdout.write(f'📝 JSON Keys: {list(data.keys())}')
                                
                                # Look for schedule-like data
                                for key, value in data.items():
                                    if isinstance(value, list) and len(value) > 0:
                                        self.stdout.write(f'   {key}: {len(value)} items')
                                        if len(value) > 0:
                                            self.stdout.write(f'   Sample item: {str(value[0])[:100]}...')
                                    elif isinstance(value, (int, str)):
                                        self.stdout.write(f'   {key}: {value}')
                            
                            elif isinstance(data, list):
                                self.stdout.write(f'📝 List with {len(data)} items')
                                if len(data) > 0:
                                    self.stdout.write(f'   Sample item: {str(data[0])[:100]}...')
                            
                            # Check if this matches our expected 18 schedules
                            if isinstance(data, list) and len(data) == 18:
                                self.stdout.write(self.style.SUCCESS('✅ Found 18 items - matches backend data!'))
                            elif isinstance(data, dict):
                                for key, value in data.items():
                                    if isinstance(value, list) and len(value) == 18:
                                        self.stdout.write(self.style.SUCCESS(f'✅ Found 18 items in "{key}" - matches backend data!'))
                                    elif isinstance(value, list) and len(value) == 4:
                                        self.stdout.write(self.style.WARNING(f'⚠️  Found 4 items in "{key}" - matches your frontend issue!'))
                        
                        except json.JSONDecodeError:
                            self.stdout.write(self.style.ERROR('❌ Failed to parse JSON response'))
                    
                    else:
                        # It's HTML - check for schedule data in the page
                        content = response.content.decode('utf-8')
                        self.stdout.write(f'📄 HTML Response Length: {len(content)} characters')
                        
                        # Look for schedule-related content
                        schedule_indicators = [
                            'schedule', 'timeslot', 'appointment', 'calendar',
                            '2025-06-29', '2025-07-05', 'Alexander Thomas', 'Noah Taylor'
                        ]
                        
                        found_indicators = []
                        for indicator in schedule_indicators:
                            if indicator.lower() in content.lower():
                                count = content.lower().count(indicator.lower())
                                found_indicators.append(f'{indicator}: {count}')
                        
                        if found_indicators:
                            self.stdout.write(f'🔍 Found indicators: {", ".join(found_indicators)}')
                        
                        # Check for JavaScript data
                        if 'var scheduleData' in content or 'window.scheduleData' in content:
                            self.stdout.write(self.style.SUCCESS('✅ Found JavaScript schedule data in HTML'))
                
                elif response.status_code == 302:
                    self.stdout.write(f'🔄 Redirected to: {response.get("Location", "Unknown")}')
                
                elif response.status_code == 403:
                    self.stdout.write(self.style.ERROR('❌ Permission denied - check user permissions'))
                
                elif response.status_code == 404:
                    self.stdout.write(self.style.ERROR('❌ Endpoint not found'))
                
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Unexpected status code: {response.status_code}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error testing endpoint: {str(e)}'))
        
        # Test with different parameters
        self.stdout.write(f'\n🔧 Testing with different parameters...')
        self.stdout.write('=' * 45)
        
        # Test calendar endpoint with various parameters
        calendar_params_to_test = [
            {'date': '2025-06-29'},
            {'week': '2025-06-29'},
            {'start': '2025-06-29', 'end': '2025-07-05'},
            {'month': '2025-06'},
            {},  # No parameters
        ]
        
        for params in calendar_params_to_test:
            self.stdout.write(f'\n📅 Testing /schedule/calendar/ with params: {params}')
            try:
                response = client.get('/schedule/calendar/', params)
                self.stdout.write(f'   Status: {response.status_code}')
                if response.status_code == 200:
                    content_type = response.get('Content-Type', '')
                    if 'json' in content_type.lower():
                        data = response.json()
                        if isinstance(data, list):
                            self.stdout.write(f'   Found {len(data)} items')
                        elif isinstance(data, dict):
                            for key, value in data.items():
                                if isinstance(value, list):
                                    self.stdout.write(f'   {key}: {len(value)} items')
            except Exception as e:
                self.stdout.write(f'   Error: {str(e)}')
        
        self.stdout.write(f'\n💡 SUMMARY & RECOMMENDATIONS:')
        self.stdout.write('=' * 35)
        self.stdout.write('1. Check which endpoint returned 18 items (matches backend)')
        self.stdout.write('2. Check which endpoint returned 4 items (matches your issue)')
        self.stdout.write('3. If no endpoint returns JSON, check HTML for embedded data')
        self.stdout.write('4. Use browser Network tab to see which endpoint frontend calls')
        self.stdout.write('5. Test the working endpoint directly to confirm data flow')
        
        self.stdout.write(f'\n✅ Endpoint testing completed!')
