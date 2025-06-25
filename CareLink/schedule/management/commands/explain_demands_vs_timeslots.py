"""
Django management command to explain the difference between schedule timeslots and service demands.

Usage: python manage.py explain_demands_vs_timeslots
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import Schedule, TimeSlot, Patient, Provider
import json

# Try to import ServiceDemand (if it exists)
try:
    from CareLink.models import ServiceDemand
    SERVICE_DEMAND_AVAILABLE = True
except ImportError:
    SERVICE_DEMAND_AVAILABLE = False


class Command(BaseCommand):
    help = 'Explain the difference between schedule timeslots and service demands'

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
        
        self.stdout.write(self.style.SUCCESS('📚 UNDERSTANDING THE DIFFERENCE'))
        self.stdout.write('=' * 50)
        
        # Explanation
        self.stdout.write(f'\n🏥 WHAT ARE TIMESLOTS?')
        self.stdout.write('-' * 25)
        self.stdout.write('• Timeslots are ACTUAL SCHEDULED APPOINTMENTS')
        self.stdout.write('• They represent confirmed care visits')
        self.stdout.write('• They have specific dates, times, patients, and providers')
        self.stdout.write('• Example: "Alexander Thomas visits Patient 4 on June 29, 18:00-20:30 for Aide infirmier"')
        
        self.stdout.write(f'\n📋 WHAT ARE SERVICE DEMANDS?')
        self.stdout.write('-' * 30)
        self.stdout.write('• Service demands are REQUESTS for care services')
        self.stdout.write('• They are created by patients/families asking for help')
        self.stdout.write('• They go through approval workflow: Pending → Under Review → Approved → In Progress → Completed')
        self.stdout.write('• "Pending demands" = requests that haven\'t been processed yet')
        self.stdout.write('• Example: "Patient needs weekly house cleaning starting July 1st" (status: Pending)')
        
        self.stdout.write(f'\n🔄 THE WORKFLOW:')
        self.stdout.write('-' * 20)
        self.stdout.write('1. Patient creates SERVICE DEMAND: "I need help with cleaning"')
        self.stdout.write('2. Coordinator reviews and approves the demand')
        self.stdout.write('3. Coordinator creates SCHEDULE with TIMESLOTS: specific appointments')
        self.stdout.write('4. Timeslots appear in calendar for providers and patients')
        
        # Current data analysis
        self.stdout.write(f'\n📊 CURRENT DATA ANALYSIS ({week_start} to {week_end}):')
        self.stdout.write('=' * 55)
        
        # 1. Timeslots (actual appointments)
        schedules = Schedule.objects.filter(date__range=[week_start, week_end])
        timeslots = TimeSlot.objects.filter(schedule__date__range=[week_start, week_end])
        
        self.stdout.write(f'\n⏰ TIMESLOTS (Actual Appointments):')
        self.stdout.write(f'   📅 Total schedules: {schedules.count()}')
        self.stdout.write(f'   🕐 Total timeslots: {timeslots.count()}')
        if schedules.exists():
            self.stdout.write(f'   📝 Examples:')
            for schedule in schedules[:3]:  # Show first 3 schedules
                patient_name = f"Patient {schedule.patient.id}" if schedule.patient else "No Patient"
                if schedule.provider and schedule.provider.user:
                    provider_name = f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}".strip() or schedule.provider.user.username
                else:
                    provider_name = "No Provider"
                
                # Get the first timeslot for this schedule
                first_timeslot = schedule.time_slots.first()
                if first_timeslot:
                    service_name = first_timeslot.service.name if first_timeslot.service else "No Service"
                    self.stdout.write(f'      • {schedule.date} {first_timeslot.start_time}-{first_timeslot.end_time}: {provider_name} → {patient_name} ({service_name})')
                else:
                    self.stdout.write(f'      • {schedule.date}: {provider_name} → {patient_name} (No timeslots)')
        else:
            self.stdout.write(f'   ❌ No timeslots found for this week')
        
        # 2. Service Demands (requests)
        if SERVICE_DEMAND_AVAILABLE:
            self.stdout.write(f'\n📋 SERVICE DEMANDS (Requests):')
            
            all_demands = ServiceDemand.objects.all()
            pending_demands = ServiceDemand.objects.filter(status='Pending')
            
            self.stdout.write(f'   📊 Total service demands: {all_demands.count()}')
            self.stdout.write(f'   ⏳ Pending demands: {pending_demands.count()}')
            
            # Status breakdown
            status_counts = {}
            for demand in all_demands:
                status = demand.status
                status_counts[status] = status_counts.get(status, 0) + 1
            
            self.stdout.write(f'   📈 Status breakdown:')
            for status, count in status_counts.items():
                self.stdout.write(f'      • {status}: {count}')
            
            if pending_demands.exists():
                self.stdout.write(f'   📝 Pending examples:')
                for demand in pending_demands[:3]:  # Show first 3
                    patient_name = f"{demand.patient}" if demand.patient else "No Patient"
                    service_name = demand.service.name if demand.service else "No Service"
                    self.stdout.write(f'      • "{demand.title}" - {patient_name} needs {service_name} (Created: {demand.created_at.date()})')
            else:
                self.stdout.write(f'   ✅ No pending demands')
        else:
            self.stdout.write(f'\n❌ SERVICE DEMANDS MODEL NOT FOUND')
            self.stdout.write(f'   This explains why your backend command couldn\'t find ServiceDemand')
        
        # 3. The mismatch explanation
        self.stdout.write(f'\n🔍 WHY YOU SEE DIFFERENT NUMBERS:')
        self.stdout.write('=' * 40)
        self.stdout.write(f'Backend Database:')
        self.stdout.write(f'  • {timeslots.count()} timeslots (confirmed appointments)')
        if SERVICE_DEMAND_AVAILABLE:
            self.stdout.write(f'  • {pending_demands.count()} pending demands (unprocessed requests)')
        else:
            self.stdout.write(f'  • ? pending demands (ServiceDemand model not found)')
        
        self.stdout.write(f'\nFrontend Display (Calendar):')
        self.stdout.write(f'  • Should show: {timeslots.count()} timeslots')
        self.stdout.write(f'  • You see: 4 timeslots (❌ MISMATCH!)')
        
        self.stdout.write(f'\nFrontend Display (Service Demands Page):')
        if SERVICE_DEMAND_AVAILABLE:
            self.stdout.write(f'  • Should show: {pending_demands.count()} pending demands')
        else:
            self.stdout.write(f'  • Should show: ? pending demands')
        self.stdout.write(f'  • You see: 2 pending demands')
        
        self.stdout.write(f'\n💡 CONCLUSIONS:')
        self.stdout.write('=' * 20)
        self.stdout.write('1. TIMESLOTS and PENDING DEMANDS are completely different things!')
        self.stdout.write('2. Timeslots = confirmed appointments (should appear in calendar)')
        self.stdout.write('3. Pending demands = unprocessed requests (appear in service demands page)')
        self.stdout.write('4. Your frontend is showing fewer timeslots than exist in backend')
        self.stdout.write('5. This suggests filtering or API issues in the calendar display')
        
        self.stdout.write(f'\n🎯 NEXT STEPS:')
        self.stdout.write('=' * 15)
        self.stdout.write('1. Use browser debug script to see what calendar API returns')
        self.stdout.write('2. Check if calendar is filtering by date, provider, or permissions')
        self.stdout.write('3. Test the /schedule/calendar/ endpoint directly')
        self.stdout.write('4. Compare backend data with frontend API responses')
        
        self.stdout.write(f'\n✅ Explanation completed!')
