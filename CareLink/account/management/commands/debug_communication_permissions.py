from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from CareLink.models import User

class Command(BaseCommand):
    help = 'Debug user permissions and groups for communication panel'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Communication Permission Debug ==='))
        
        # List all groups
        self.stdout.write('\n--- All Groups ---')
        groups = Group.objects.all()
        for group in groups:
            self.stdout.write(f"Group: {group.name}")
        
        # List users with Coordinator role
        self.stdout.write('\n--- Users with Coordinator role ---')
        coordinators = User.objects.filter(role='Coordinator')
        for user in coordinators:
            self.stdout.write(f"User: {user.email}")
            self.stdout.write(f"  - Role: {user.role}")
            self.stdout.write(f"  - is_staff: {user.is_staff}")
            self.stdout.write(f"  - is_superuser: {user.is_superuser}")
            self.stdout.write(f"  - Groups: {list(user.groups.values_list('name', flat=True))}")
            self.stdout.write("")
        
        # List superusers
        self.stdout.write('\n--- Superusers ---')
        superusers = User.objects.filter(is_superuser=True)
        for user in superusers:
            self.stdout.write(f"User: {user.email}")
            self.stdout.write(f"  - Role: {user.role}")
            self.stdout.write(f"  - is_staff: {user.is_staff}")
            self.stdout.write(f"  - is_superuser: {user.is_superuser}")
            self.stdout.write(f"  - Groups: {list(user.groups.values_list('name', flat=True))}")
            self.stdout.write("")
        
        self.stdout.write(self.style.SUCCESS('=== End Debug ==='))
