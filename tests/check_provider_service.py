#!/usr/bin/env python3
"""
Script to check and update provider service
"""

import os
import sys
import django

# Add the CareLink directory to the Python path
carelink_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CareLink')
sys.path.append(carelink_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import Provider, Service

User = get_user_model()

def check_and_update_provider():
    """Check provider data and update service if needed"""
    
    print("🔍 Checking Provider Data")
    print("=" * 50)
    
    # Check user ID 729
    try:
        user = User.objects.get(id=729)
        print(f"✅ Found user: {user.firstname} {user.lastname} ({user.email})")
        print(f"   Role: {user.role}")
        print(f"   Is Active: {user.is_active}")
    except User.DoesNotExist:
        print("❌ User ID 729 not found")
        return False
    
    # Check if user has a provider profile
    try:
        provider = Provider.objects.get(user=user)
        print(f"✅ Found provider profile:")
        print(f"   Provider ID: {provider.id}")
        print(f"   Is Internal: {provider.is_internal}")
        
        if provider.service:
            print(f"   Current Service: {provider.service.name} (ID: {provider.service.id})")
        else:
            print(f"   Current Service: None (No service assigned)")
            
    except Provider.DoesNotExist:
        print("❌ No provider profile found for this user")
        return False
    
    # Check if Service 3 exists
    try:
        service3 = Service.objects.get(id=3)
        print(f"\n✅ Service 3 exists: {service3.name}")
    except Service.DoesNotExist:
        print(f"\n🔧 Creating Service 3...")
        service3 = Service.objects.create(
            id=3,
            name="Specialized Care Service",
            description="Specialized healthcare services for complex cases",
            price=75.00,
            duration=45
        )
        print(f"✅ Created Service 3: {service3.name}")
    
    # Update provider service to Service 3
    if provider.service != service3:
        print(f"\n🔄 Updating provider service from {provider.service.name if provider.service else 'None'} to {service3.name}")
        provider.service = service3
        provider.save()
        print(f"✅ Provider service updated successfully!")
    else:
        print(f"\n✅ Provider already has Service 3 assigned")
    
    # Verify the update
    provider.refresh_from_db()
    print(f"\n📋 Final provider data:")
    print(f"   Provider ID: {provider.id}")
    print(f"   User: {provider.user.firstname} {provider.user.lastname}")
    print(f"   Service: {provider.service.name if provider.service else 'None'}")
    print(f"   Is Internal: {provider.is_internal}")
    
    return True

def test_profile_endpoint():
    """Test the profile endpoint to see if provider data is included"""
    
    print(f"\n🧪 Testing Profile Endpoint")
    print("=" * 50)
    
    # This would require authentication, so we'll just show what to expect
    print("To test the profile endpoint, you would need to:")
    print("1. Login as the provider user")
    print("2. Call GET /account/profile/")
    print("3. Check if 'provider' data is included in the response")
    print("4. Verify that service information is present")
    
    print("\nExpected profile response structure:")
    print("""
    {
        "user": { ... },
        "provider": {
            "id": 1,
            "is_internal": true,
            "service": {
                "id": 3,
                "name": "Specialized Care Service",
                "description": "Specialized healthcare services for complex cases",
                "price": "75.00"
            }
        },
        ...
    }
    """)

if __name__ == "__main__":
    print("🚀 Provider Service Check and Update")
    print("=" * 50)
    
    # Check and update provider
    success = check_and_update_provider()
    
    if success:
        print("\n✅ Provider data updated successfully!")
        
        # Test profile endpoint info
        test_profile_endpoint()
        
        print("\n📋 Next Steps:")
        print("1. The provider now has Service 3 assigned")
        print("2. When you log in as this provider, you can access patient doctor information when viewing appointments in the schedule")
        print("3. The profile endpoint should now include provider service information")
    else:
        print("\n❌ Failed to update provider data")
    
    print("\n" + "=" * 50) 