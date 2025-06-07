#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import UserActionLog, Provider

print("=== Provider Names in Recent Logs ===")
logs = UserActionLog.objects.filter(affected_provider_name__isnull=False).order_by('-created_at')[:5]
for log in logs:
    print(f'Log {log.id}: Provider = "{log.affected_provider_name}"')

print("\n=== Actual Provider Users in Database ===")
providers = Provider.objects.select_related('user')[:3]
for p in providers:
    if p.user:
        print(f'Provider {p.id}: "{p.user.firstname} {p.user.lastname}"')
    else:
        print(f'Provider {p.id}: No associated user')

print("\n=== Source of 'Dr.' Prefix ===")
print("The 'Dr.' prefix comes from:")
print("1. Test script (test_frontend_logging.py) - lines 36, 53, 70")
print("2. NOT from the actual logging functions")
print("3. The real logging functions just use: firstname + lastname")
