"""
Django management command to test schedule data synchronization.

Usage: python manage.py test_schedule_sync
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import Schedule, TimeSlot, Patient, Provider
import json


class Command(BaseCommand):
    help = 'Test schedule data synchronization and identify discrepancies'

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
        
        self.stdout.write(self.style.SUCCESS(f'Testing schedule data for week: {week_start} to {week_end}'))
        
        # 1. Basic schedule count
        schedules = Schedule.objects.filter(date__range=[week_start, week_end])
        self.stdout.write(f'\n📅 Schedules in date range: {schedules.count()}')
        
        # 2. Timeslot count
        timeslots = TimeSlot.objects.filter(schedule__date__range=[week_start, week_end])
        self.stdout.write(f'⏰ Timeslots in date range: {timeslots.count()}')
        
        # 3. Blocked time (no patient)
        blocked_schedules = schedules.filter(patient__isnull=True)
        self.stdout.write(f'🚫 Blocked time schedules: {blocked_schedules.count()}')
        
        # 4. Service demands check
        try:
            from servicedemands.models import ServiceDemand
            pending_demands = ServiceDemand.objects.filter(status='pending')
            self.stdout.write(f'📋 Pending service demands: {pending_demands.count()}')
        except ImportError:
            self.stdout.write(self.style.WARNING('ServiceDemand model not found'))
        
        # 5. Detailed breakdown
        if schedules.exists():
            self.stdout.write(f'\n📊 Detailed Schedule Breakdown:')
            self.stdout.write('-' * 50)
            
            for schedule in schedules:
                patient_info = f"{schedule.patient}" if schedule.patient else "Blocked Time"
                providers = ", ".join([p.user.get_full_name() or p.user.username for p in schedule.providers.all()])
                timeslot_count = schedule.timeslots.count()
                
                self.stdout.write(f'Date: {schedule.date}')
                self.stdout.write(f'  Patient: {patient_info}')
                self.stdout.write(f'  Providers: {providers}')
                self.stdout.write(f'  Timeslots: {timeslot_count}')
                
                for ts in schedule.timeslots.all():
                    service_name = ts.service.name if ts.service else "No Service"
                    self.stdout.write(f'    {ts.start_time}-{ts.end_time} | {service_name} | {ts.status}')
                self.stdout.write('')
        
        # 6. Check for common issues
        self.stdout.write(f'\n🔍 Common Issues Check:')
        self.stdout.write('-' * 30)
        
        # Orphaned timeslots
        orphaned_timeslots = TimeSlot.objects.filter(schedule__isnull=True)
        if orphaned_timeslots.exists():
            self.stdout.write(self.style.WARNING(f'⚠️  Found {orphaned_timeslots.count()} orphaned timeslots'))
        
        # Schedules without timeslots
        empty_schedules = schedules.filter(timeslots__isnull=True)
        if empty_schedules.exists():
            self.stdout.write(self.style.WARNING(f'⚠️  Found {empty_schedules.count()} schedules without timeslots'))
        
        # Future vs past schedules
        today = datetime.now().date()
        future_schedules = schedules.filter(date__gt=today)
        past_schedules = schedules.filter(date__lt=today)
        today_schedules = schedules.filter(date=today)
        
        self.stdout.write(f'📈 Future schedules: {future_schedules.count()}')
        self.stdout.write(f'📉 Past schedules: {past_schedules.count()}')
        self.stdout.write(f'📍 Today schedules: {today_schedules.count()}')
        
        # 7. Summary and analysis
        total_timeslots = timeslots.count()
        total_schedules = schedules.count()
        
        self.stdout.write(f'\n📋 SUMMARY:')
        self.stdout.write('=' * 20)
        self.stdout.write(f'Schedules: {total_schedules}')
        self.stdout.write(f'Timeslots: {total_timeslots}')
        self.stdout.write(f'Blocked time: {blocked_schedules.count()}')
        
        try:
            pending_count = ServiceDemand.objects.filter(status='pending').count()
            self.stdout.write(f'Pending demands: {pending_count}')
            
            # Check if this matches user's observation
            if total_timeslots == 4 and pending_count == 2:
                self.stdout.write(self.style.SUCCESS('\n✅ This matches the reported issue: 4 timeslots, 2 pending demands'))
                self.stdout.write(self.style.WARNING('🔍 Possible causes for not seeing them in calendar:'))
                self.stdout.write('   1. Frontend filtering issues')
                self.stdout.write('   2. User permission restrictions')
                self.stdout.write('   3. Date range calculation problems')
                self.stdout.write('   4. API response filtering')
            elif total_timeslots == 0:
                self.stdout.write(self.style.ERROR('❌ No timeslots found in database for this week'))
            else:
                self.stdout.write(f'📊 Found {total_timeslots} timeslots (expected 4 based on user report)')
        except:
            pass
        
        self.stdout.write(f'\n✅ Test completed!')
