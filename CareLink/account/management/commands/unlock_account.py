from django.core.management.base import BaseCommand
from CareLink.models import User
from django.utils import timezone

class Command(BaseCommand):
    help = 'Unlock a user account that has been locked due to failed login attempts'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address of the user to unlock')
        parser.add_argument('--list-locked', action='store_true', help='List all locked accounts')

    def handle(self, *args, **options):
        if options['list_locked']:
            self.list_locked_accounts()
            return

        email = options['email']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email "{email}" does not exist.')
            )
            return

        if not user.is_account_locked() and user.failed_login_attempts == 0:
            self.stdout.write(
                self.style.WARNING(f'Account for {email} is not locked.')
            )
            return

        # Show current status
        lockout_info = user.get_lockout_info()
        if lockout_info['is_locked']:
            self.stdout.write(
                self.style.WARNING(
                    f'Account for {email} is currently locked until {user.account_locked_until} '
                    f'({lockout_info["minutes_remaining"]} minutes remaining)'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Account for {email} has {user.failed_login_attempts} failed login attempts'
                )
            )

        # Unlock the account
        user.unlock_account()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully unlocked account for {email}')
        )

    def list_locked_accounts(self):
        """List all currently locked accounts"""
        now = timezone.now()
        locked_users = User.objects.filter(
            account_locked_until__gt=now
        ).order_by('-account_locked_until')
        
        if not locked_users.exists():
            self.stdout.write(
                self.style.SUCCESS('No accounts are currently locked.')
            )
            return

        self.stdout.write(
            self.style.WARNING(f'Found {locked_users.count()} locked accounts:')
        )
        self.stdout.write('')
        
        for user in locked_users:
            lockout_info = user.get_lockout_info()
            self.stdout.write(
                f'• {user.email} ({user.firstname} {user.lastname})'
            )
            self.stdout.write(
                f'  - Failed attempts: {user.failed_login_attempts}'
            )
            self.stdout.write(
                f'  - Locked until: {user.account_locked_until}'
            )
            self.stdout.write(
                f'  - Minutes remaining: {lockout_info["minutes_remaining"]}'
            )
            self.stdout.write('')
        
        self.stdout.write('To unlock an account, run:')
        self.stdout.write('python manage.py unlock_account <email>') 