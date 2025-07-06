#!/usr/bin/env python3
"""
Simple script to fix provider service
"""

import os
import sys
import django

# Setup Django
carelink_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CareLink')
sys.path.append(carelink_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Provider, Service

def fix_provider_service():
    print("🔧 Fixing Provider Service")
    print("=" * 40)
    
    # Get or create Service 3
    service3, created = Service.objects.get_or_create(
        id=3,
        defaults={
            'name': 'Specialized Care Service',
            'description': 'Specialized healthcare services for complex cases',
            'price': 75.00,
            'duration': 45
        }
    )
    
    if created:
        print(f"✅ Created Service 3: {service3.name}")
    else:
        print(f"✅ Found Service 3: {service3.name}")
    
    # Find provider for user 729
    try:
        provider = Provider.objects.get(user_id=729)
        print(f"✅ Found provider for user 729")
        print(f"   Current service: {provider.service.name if provider.service else 'None'}")
        
        # Update to Service 3
        provider.service = service3
        provider.save()
        
        print(f"✅ Updated provider service to: {service3.name}")
        print(f"✅ Provider now has Service 3!")
        
    except Provider.DoesNotExist:
        print("❌ No provider found for user 729")
        return False
    
    return True

if __name__ == "__main__":
    success = fix_provider_service()
    if success:
        print("\n🎉 Provider service fixed!")
        print("Now when you log in as this provider, you can access patient doctor information when viewing appointments in the schedule.")
    else:
        print("\n❌ Failed to fix provider service") 