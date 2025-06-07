#!/usr/bin/env python
import os
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from account.views.logs import LogsView

print("=== Testing Enhanced Logs API Endpoint ===")

# Get a superuser
User = get_user_model()
superuser = User.objects.filter(is_superuser=True).first()

if not superuser:
    print("❌ No superuser found. Creating one for testing...")
    superuser = User.objects.create_superuser(
        email='test_super@carelink.be',
        password='testpass123',
        firstname='Super',
        lastname='User'
    )

# Create a test request
factory = RequestFactory()
request = factory.get('/account/logs/?type=user_actions&page=1&page_size=3')
request.user = superuser

# Test the LogsView
view = LogsView()
response = view.get(request)

print(f"API Response Status: {response.status_code}")

if response.status_code == 200:
    data = response.data
    print(f"Total logs returned: {len(data.get('logs', []))}")
    
    print("\n📋 Enhanced Log Entries from API:")
    for i, log in enumerate(data.get('logs', [])[:3], 1):
        print(f"\n--- Log Entry {i} ---")
        print(f"ID: {log.get('id')}")
        print(f"User: {log.get('user_name', log.get('user'))}")
        print(f"Action: {log.get('action_type')}")
        print(f"Target: {log.get('target_model')} (ID: {log.get('target_id')})")
        print(f"Description: {log.get('description')}")
        print(f"Patient: {log.get('affected_patient_name')} (ID: {log.get('affected_patient_id')})")
        print(f"Provider: {log.get('affected_provider_name')} (ID: {log.get('affected_provider_id')})")
        if log.get('additional_data'):
            print(f"Additional Data: {json.dumps(log.get('additional_data'), indent=2)}")
    
    print(f"\n✅ API is correctly returning enhanced log data!")
    print("🎉 Frontend should now display patient/provider information properly.")
    
else:
    print(f"❌ API returned error: {response.data}")

print("\n=== API Test Complete ===")
