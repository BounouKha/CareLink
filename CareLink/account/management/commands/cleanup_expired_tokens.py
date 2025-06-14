from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
import logging

logger = logging.getLogger('carelink')

class Command(BaseCommand):
    help = 'Clean up expired JWT tokens to maintain database performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to keep blacklisted tokens (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
    
    def handle(self, *args, **options):
        days_to_keep = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Cleaning up tokens older than {days_to_keep} days (before {cutoff_date})'
            )
        )
        
        # Find blacklisted tokens to remove
        expired_blacklisted = BlacklistedToken.objects.filter(
            blacklisted_at__lt=cutoff_date
        ).select_related('token')
        
        blacklisted_count = expired_blacklisted.count()
        
        if blacklisted_count == 0:
            self.stdout.write(
                self.style.SUCCESS('No expired tokens found to clean up.')
            )
            return
        
        # Get associated outstanding tokens
        outstanding_ids = [bt.token.id for bt in expired_blacklisted]
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {blacklisted_count} blacklisted tokens '
                    f'and {len(outstanding_ids)} outstanding tokens'
                )
            )
            
            # Show sample of tokens that would be deleted
            sample_tokens = expired_blacklisted[:5]
            for bt in sample_tokens:
                self.stdout.write(f'  - Token JTI: {bt.token.jti}, Blacklisted: {bt.blacklisted_at}')
            
            if blacklisted_count > 5:
                self.stdout.write(f'  ... and {blacklisted_count - 5} more')
            
        else:
            # Perform actual cleanup
            try:
                # Delete blacklisted tokens (this will cascade to outstanding tokens if configured)
                deleted_blacklisted, _ = BlacklistedToken.objects.filter(
                    blacklisted_at__lt=cutoff_date
                ).delete()
                
                # Clean up any orphaned outstanding tokens
                deleted_outstanding, _ = OutstandingToken.objects.filter(
                    id__in=outstanding_ids
                ).delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully cleaned up:'
                        f'\n  - {deleted_blacklisted} blacklisted tokens'
                        f'\n  - {deleted_outstanding} outstanding tokens'
                    )
                )
                
                # Log the cleanup operation
                logger.info(
                    f'JWT token cleanup completed: '
                    f'{deleted_blacklisted} blacklisted, {deleted_outstanding} outstanding tokens removed'
                )
                
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(f'Error during cleanup: {e}')
                )
                logger.error(f'JWT token cleanup failed: {e}')
                raise
        
        # Show database statistics
        self.show_token_statistics()
    
    def show_token_statistics(self):
        """Display current token database statistics"""
        total_outstanding = OutstandingToken.objects.count()
        total_blacklisted = BlacklistedToken.objects.count()
        
        # Recent activity (last 24 hours)
        recent_cutoff = timezone.now() - timedelta(hours=24)
        recent_outstanding = OutstandingToken.objects.filter(
            created_at__gte=recent_cutoff
        ).count()
        recent_blacklisted = BlacklistedToken.objects.filter(
            blacklisted_at__gte=recent_cutoff
        ).count()
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Current Token Statistics:'))
        self.stdout.write(f'  Total Outstanding Tokens: {total_outstanding}')
        self.stdout.write(f'  Total Blacklisted Tokens: {total_blacklisted}')
        self.stdout.write(f'  Outstanding (24h): {recent_outstanding}')
        self.stdout.write(f'  Blacklisted (24h): {recent_blacklisted}')
        self.stdout.write('='*50)
