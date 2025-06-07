from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from CareLink.models import (
    User, Patient, Provider, ServiceDemand, Schedule, 
    HelpdeskTicket, Invoice, Payment, TimeSlot
)
import logging

logger = logging.getLogger('carelink.admin')

class Command(BaseCommand):
    help = 'Perform health checks and generate system status report'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--fix-issues',
            action='store_true',
            help='Automatically fix detected issues where possible'
        )
        parser.add_argument(
            '--email-report',
            action='store_true',
            help='Email the health check report to administrators'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting CareLink health check...'))
        
        issues = []
        warnings = []
        
        # Check user data integrity
        user_issues = self.check_user_integrity()
        issues.extend(user_issues['issues'])
        warnings.extend(user_issues['warnings'])
        
        # Check schedule consistency
        schedule_issues = self.check_schedule_integrity()
        issues.extend(schedule_issues['issues'])
        warnings.extend(schedule_issues['warnings'])
        
        # Check service demand status
        demand_issues = self.check_service_demands()
        issues.extend(demand_issues['issues'])
        warnings.extend(demand_issues['warnings'])
        
        # Check financial data
        financial_issues = self.check_financial_integrity()
        issues.extend(financial_issues['issues'])
        warnings.extend(financial_issues['warnings'])
        
        # Auto-fix issues if requested
        if options['fix_issues']:
            self.fix_detected_issues(issues)
        
        # Generate report
        self.generate_report(issues, warnings)
        
        # Email report if requested
        if options['email_report']:
            self.email_health_report(issues, warnings)
        
        if issues:
            self.stdout.write(self.style.ERROR(f'Health check completed with {len(issues)} issues found.'))
        else:
            self.stdout.write(self.style.SUCCESS('Health check completed successfully - no issues found.'))
    
    def check_user_integrity(self):
        """Check user data integrity"""
        issues = []
        warnings = []
        
        # Check for users without profiles
        users_without_profiles = User.objects.filter(
            patient__isnull=True,
            provider__isnull=True,
            coordinator__isnull=True,
            administrative__isnull=True,
            socialassistant__isnull=True
        ).exclude(role='Administrator')
        
        if users_without_profiles.exists():
            issues.append(f"Found {users_without_profiles.count()} users without role-specific profiles")
        
        # Check for duplicate emails
        duplicate_emails = User.objects.values('email').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicate_emails.exists():
            issues.append(f"Found {duplicate_emails.count()} duplicate email addresses")
        
        # Check for inactive patients with active schedules
        inactive_patients_with_schedules = Patient.objects.filter(
            is_alive=False,
            schedule__date__gte=timezone.now().date()
        ).distinct()
        
        if inactive_patients_with_schedules.exists():
            warnings.append(f"Found {inactive_patients_with_schedules.count()} inactive patients with future schedules")
        
        return {'issues': issues, 'warnings': warnings}
    
    def check_schedule_integrity(self):
        """Check schedule and timeslot integrity"""
        issues = []
        warnings = []
        
        # Check for schedules without timeslots
        schedules_without_timeslots = Schedule.objects.filter(time_slots__isnull=True)
        if schedules_without_timeslots.exists():
            warnings.append(f"Found {schedules_without_timeslots.count()} schedules without timeslots")
        
        # Check for overlapping timeslots for the same provider
        today = timezone.now().date()
        future_schedules = Schedule.objects.filter(date__gte=today)
        
        overlap_count = 0
        for schedule in future_schedules:
            provider_schedules = Schedule.objects.filter(
                provider=schedule.provider,
                date=schedule.date
            ).exclude(id=schedule.id)
            
            for other_schedule in provider_schedules:
                # Check for timeslot overlaps
                for timeslot in schedule.time_slots.all():
                    overlapping = other_schedule.time_slots.filter(
                        start_time__lt=timeslot.end_time,
                        end_time__gt=timeslot.start_time
                    )
                    if overlapping.exists():
                        overlap_count += 1
        
        if overlap_count > 0:
            issues.append(f"Found {overlap_count} overlapping timeslots")
        
        # Check for timeslots with invalid time ranges
        invalid_timeslots = TimeSlot.objects.filter(start_time__gte=models.F('end_time'))
        if invalid_timeslots.exists():
            issues.append(f"Found {invalid_timeslots.count()} timeslots with invalid time ranges")
        
        return {'issues': issues, 'warnings': warnings}
    
    def check_service_demands(self):
        """Check service demand status and aging"""
        issues = []
        warnings = []
        
        # Check for old pending demands
        week_ago = timezone.now() - timedelta(days=7)
        old_pending = ServiceDemand.objects.filter(
            status='Pending',
            created_at__lt=week_ago
        )
        
        if old_pending.exists():
            warnings.append(f"Found {old_pending.count()} service demands pending for over a week")
        
        # Check for urgent demands without assigned providers
        urgent_unassigned = ServiceDemand.objects.filter(
            priority='Urgent',
            assigned_provider__isnull=True,
            status__in=['Pending', 'Under Review', 'Approved']
        )
        
        if urgent_unassigned.exists():
            issues.append(f"Found {urgent_unassigned.count()} urgent demands without assigned providers")
        
        # Check for approved demands without schedules
        approved_without_schedule = ServiceDemand.objects.filter(
            status='Approved',
            assigned_provider__isnull=False
        )
        
        unscheduled_count = 0
        for demand in approved_without_schedule:
            if not Schedule.objects.filter(
                patient=demand.patient,
                provider=demand.assigned_provider,
                date__gte=timezone.now().date()
            ).exists():
                unscheduled_count += 1
        
        if unscheduled_count > 0:
            warnings.append(f"Found {unscheduled_count} approved demands without schedules")
        
        return {'issues': issues, 'warnings': warnings}
    
    def check_financial_integrity(self):
        """Check financial data integrity"""
        issues = []
        warnings = []
        
        # Check for invoices without payments after 30 days
        month_ago = timezone.now() - timedelta(days=30)
        old_unpaid = Invoice.objects.filter(
            status='Unpaid',
            created_at__lt=month_ago
        )
        
        if old_unpaid.exists():
            warnings.append(f"Found {old_unpaid.count()} invoices unpaid for over 30 days")
        
        # Check for payments without valid invoices
        orphaned_payments = Payment.objects.filter(patient__invoice__isnull=True)
        if orphaned_payments.exists():
            issues.append(f"Found {orphaned_payments.count()} payments without valid invoices")
        
        return {'issues': issues, 'warnings': warnings}
    
    def fix_detected_issues(self, issues):
        """Attempt to fix detected issues automatically"""
        self.stdout.write(self.style.WARNING('Attempting to fix detected issues...'))
        
        # Fix invalid timeslots
        invalid_timeslots = TimeSlot.objects.filter(start_time__gte=models.F('end_time'))
        if invalid_timeslots.exists():
            self.stdout.write(f'Deleting {invalid_timeslots.count()} invalid timeslots...')
            invalid_timeslots.delete()
        
        # Other auto-fixes can be added here
        logger.info("Auto-fix completed for detected issues")
    
    def generate_report(self, issues, warnings):
        """Generate and display health check report"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('CARELINK HEALTH CHECK REPORT'))
        self.stdout.write('='*50)
        
        if issues:
            self.stdout.write(self.style.ERROR(f'\nISSUES FOUND ({len(issues)}):'))
            for i, issue in enumerate(issues, 1):
                self.stdout.write(f'  {i}. {issue}')
        
        if warnings:
            self.stdout.write(self.style.WARNING(f'\nWARNINGS ({len(warnings)}):'))
            for i, warning in enumerate(warnings, 1):
                self.stdout.write(f'  {i}. {warning}')
        
        if not issues and not warnings:
            self.stdout.write(self.style.SUCCESS('\n✓ All checks passed - system is healthy!'))
        
        # System statistics
        self.stdout.write('\nSYSTEM STATISTICS:')
        self.stdout.write(f'  Total Users: {User.objects.count()}')
        self.stdout.write(f'  Active Patients: {Patient.objects.filter(is_alive=True).count()}')
        self.stdout.write(f'  Active Providers: {Provider.objects.count()}')
        self.stdout.write(f'  Pending Service Demands: {ServiceDemand.objects.filter(status="Pending").count()}')
        self.stdout.write(f'  Today\'s Schedules: {Schedule.objects.filter(date=timezone.now().date()).count()}')
        
        self.stdout.write('\n' + '='*50)
    
    def email_health_report(self, issues, warnings):
        """Email the health report to administrators"""
        # This would implement email functionality
        # For now, just log that it would send an email
        logger.info("Health check report would be emailed to administrators")
        self.stdout.write(self.style.SUCCESS('Health report logged for email distribution'))

from django.db import models
