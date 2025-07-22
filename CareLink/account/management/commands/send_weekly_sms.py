"""
Django management command to send weekly SMS notifications
Run this command every Saturday at 18:00 (6 PM) via cron job

Usage:
python manage.py send_weekly_sms

Cron job example (Saturday 18:00):
0 18 * * 6 cd /path/to/carelink && python manage.py send_weekly_sms
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from account.services.weekly_sms_service import weekly_sms_service
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send weekly SMS notifications to patients and providers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--week-offset',
            type=int,
            default=1,
            help='Week offset (1 = next week, 0 = current week)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be sent without actually sending SMS',
        )

    def handle(self, *args, **options):
        week_offset = options['week_offset']
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting weekly SMS notifications (week offset: {week_offset})')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No SMS will actually be sent')
            )
        
        try:
            # Send weekly notifications
            result = weekly_sms_service.send_weekly_notifications(week_offset=week_offset)
            
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Weekly SMS notifications completed successfully!\n"
                        f"📅 Week: {result['week_start']} to {result['week_end']}\n"
                        f"👤 Patients - Sent: {result['patients']['sent']}, Failed: {result['patients']['failed']}, Skipped: {result['patients']['skipped']}\n"
                        f"👩‍⚕️ Providers - Sent: {result['providers']['sent']}, Failed: {result['providers']['failed']}, Skipped: {result['providers']['skipped']}\n"
                        f"📊 Total: {result['total_sent']} sent, {result['total_failed']} failed, {result['total_skipped']} skipped"
                    )
                )
                
                # Log summary
                logger.info(f"Weekly SMS command completed: {result['total_sent']} sent, {result['total_failed']} failed")
                
            else:
                error_msg = f"❌ Failed to send weekly SMS notifications: {result['error']}"
                self.stdout.write(self.style.ERROR(error_msg))
                logger.error(f"Weekly SMS command failed: {result['error']}")
                raise CommandError(error_msg)
                
        except Exception as e:
            error_msg = f"❌ Unexpected error: {str(e)}"
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f"Weekly SMS command exception: {str(e)}")
            raise CommandError(error_msg)
