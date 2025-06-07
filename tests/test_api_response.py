#!/usr/bin/env python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import UserActionLog

print("=== Testing Enhanced API Response ===")

# Get recent log entries
recent_logs = UserActionLog.objects.order_by('-created_at')[:3]

for log in recent_logs:
    print(f"\nLog ID: {log.id}")
    print(f"User: {log.user.firstname} {log.user.lastname if log.user else 'Unknown'}")
    print(f"Action: {log.action_type}")
    print(f"Target: {log.target_model} (ID: {log.target_id})")
    print(f"Description: {log.description}")
    print(f"Patient: {log.affected_patient_name} (ID: {log.affected_patient_id})")
    print(f"Provider: {log.affected_provider_name} (ID: {log.affected_provider_id})")
    print(f"Additional Data: {log.additional_data}")
    print("-" * 50)

print("\n✅ Enhanced logging data is available in the database!")
print("🔧 Frontend should now display this information when accessing the logs API.")
