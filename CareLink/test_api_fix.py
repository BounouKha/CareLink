#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django setup error: {e}")
    sys.exit(1)

from account.views.schedule import ScheduleCalendarView
from django.test import RequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()

# Create a test request for 2025-07-01 where we have duplicate schedules
factory = RequestFactory()
request = factory.get('/schedule/calendar/?start_date=2025-07-01&end_date=2025-07-01&view=day')

# Create a mock coordinator user
admin_user = User.objects.filter(role='Coordinator').first()
if not admin_user:
    admin_user = User.objects.filter(role='Administrative').first()
    
if admin_user:
    request.user = admin_user
    view = ScheduleCalendarView()
    response = view.get(request)
    print('=== API RESPONSE TEST ===')
    print('API Response Status:', response.status_code)
    print('Calendar Data Length:', len(response.data.get('calendar_data', [])))
    
    for schedule in response.data.get('calendar_data', []):
        print(f"Schedule ID: {schedule['id']} - Patient: {schedule['patient']['name']} - Timeslots: {len(schedule['timeslots'])}")
        for ts in schedule['timeslots']:
            print(f"  TimeSlot ID: {ts['id']} - Time: {ts['start_time']}-{ts['end_time']}")
else:
    print('No coordinator/admin user found')
