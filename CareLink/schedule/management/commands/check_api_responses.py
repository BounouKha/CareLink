"""
Django management command to simulate API calls and check what data is being returned.

Usage: python manage.py check_api_responses
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import Schedule, TimeSlot, Patient, Provider
from django.core import serializers
import json


class Command(BaseCommand):
    help = 'Check what API responses would look like for schedule data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--week-start',
            type=str,
            default='2025-06-29',
            help='Start date of the week to test (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--week-end',
            type=str,
            default='2025-07-05',
            help='End date of the week to test (YYYY-MM-DD format)'
        )

    def handle(self, *args, **options):
        week_start = datetime.strptime(options['week_start'], '%Y-%m-%d').date()
        week_end = datetime.strptime(options['week_end'], '%Y-%m-%d').date()
        
        self.stdout.write(self.style.SUCCESS(f'Checking API responses for week: {week_start} to {week_end}'))
        
        # 1. Simulate schedule API response
        schedules = Schedule.objects.filter(date__range=[week_start, week_end])
        
        self.stdout.write(f'\n📡 SIMULATED API RESPONSES:')
        self.stdout.write('=' * 40)
        
        # Convert to JSON-like structure (similar to DRF serializer)
        schedule_data = []
        for schedule in schedules:
            schedule_dict = {
                'id': schedule.id,
                'date': str(schedule.date),
                'patient': {
                    'id': schedule.patient.id if schedule.patient else None,
                    'name': str(schedule.patient) if schedule.patient else None
                },
                'provider': {
                    'id': schedule.provider.id if schedule.provider else None,
                    'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}".strip() or schedule.provider.user.username if schedule.provider else None
                },
                'time_slots': []
            }
            
            # Add timeslots
            for ts in schedule.time_slots.all():
                slot_dict = {
                    'id': ts.id,
                    'start_time': str(ts.start_time),
                    'end_time': str(ts.end_time),
                    'status': ts.status,
                    'service': {
                        'id': ts.service.id if ts.service else None,
                        'name': ts.service.name if ts.service else None
                    }
                }
                schedule_dict['time_slots'].append(slot_dict)
            
            schedule_data.append(schedule_dict)
        
        self.stdout.write(f'📊 Schedule API Response (JSON):')
        self.stdout.write('-' * 35)
        print(json.dumps(schedule_data, indent=2, ensure_ascii=False))
        
        # 2. Summary
        self.stdout.write(f'\n📋 API RESPONSE SUMMARY:')
        self.stdout.write('=' * 25)
        self.stdout.write(f'Total schedules returned: {len(schedule_data)}')
        
        total_timeslots = sum(len(s['time_slots']) for s in schedule_data)
        self.stdout.write(f'Total timeslots returned: {total_timeslots}')
        
        # Group by date
        dates = {}
        for schedule in schedule_data:
            date = schedule['date']
            if date not in dates:
                dates[date] = []
            dates[date].append(schedule)
        
        self.stdout.write(f'\n📅 Breakdown by date:')
        for date, day_schedules in sorted(dates.items()):
            day_timeslots = sum(len(s['time_slots']) for s in day_schedules)
            self.stdout.write(f'  {date}: {len(day_schedules)} schedules, {day_timeslots} timeslots')
        
        # 3. Check for potential filtering issues
        self.stdout.write(f'\n🔍 POTENTIAL FILTERING ISSUES:')
        self.stdout.write('-' * 35)
        
        # Check for future dates only
        today = datetime.now().date()
        future_schedules = [s for s in schedule_data if datetime.strptime(s['date'], '%Y-%m-%d').date() > today]
        past_schedules = [s for s in schedule_data if datetime.strptime(s['date'], '%Y-%m-%d').date() < today]
        
        self.stdout.write(f'Future schedules: {len(future_schedules)}')
        self.stdout.write(f'Past schedules: {len(past_schedules)}')
        
        if len(past_schedules) > 0:
            self.stdout.write(self.style.WARNING('⚠️  Frontend might be filtering out past schedules'))
        
        # Check for specific providers
        providers = set()
        for schedule in schedule_data:
            if schedule['provider']['name']:
                providers.add(schedule['provider']['name'])
        
        self.stdout.write(f'Unique providers: {", ".join(providers)}')
        
        # Check for specific services
        services = set()
        for schedule in schedule_data:
            for slot in schedule['time_slots']:
                if slot['service']['name']:
                    services.add(slot['service']['name'])
        
        self.stdout.write(f'Unique services: {", ".join(services)}')
        
        self.stdout.write(f'\n✅ API response check completed!')
        
        # 4. Recommendations
        self.stdout.write(f'\n💡 DEBUGGING RECOMMENDATIONS:')
        self.stdout.write('=' * 30)
        self.stdout.write('1. Check if frontend is filtering by:')
        self.stdout.write('   - Date range (past vs future)')
        self.stdout.write('   - Provider permissions')
        self.stdout.write('   - Service type')
        self.stdout.write('   - Schedule status')
        self.stdout.write('2. Compare this JSON output with actual API responses')
        self.stdout.write('3. Check browser network tab for actual API calls')
        self.stdout.write('4. Use the advanced frontend debug script in browser console')
