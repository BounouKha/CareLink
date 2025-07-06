#!/usr/bin/env python
import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Service, User, Provider

def test_provider_creation():
    """Test provider creation functionality"""
    print("=== Testing Provider Creation ===")
    
    # Check available services
    print("\n=== Available Services ===")
    services = Service.objects.all()
    for service in services:
        print(f"ID: {service.id}, Name: {service.name}, Price: {service.price}")
    
    # Check if user 731 exists
    print("\n=== User 731 Details ===")
    try:
        user = User.objects.get(id=732)
        print(f"User ID: {user.id}")
        print(f"Name: {user.firstname} {user.lastname}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        
        # Check if user already has a provider profile
        try:
            provider = Provider.objects.get(user=user)
            print(f"Provider profile exists: ID {provider.id}")
            print(f"Service: {provider.service.name if provider.service else 'None'}")
            print(f"Is Internal: {provider.is_internal}")
        except Provider.DoesNotExist:
            print("No provider profile exists for this user")
            
    except User.DoesNotExist:
        print("User 731 not found")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_provider_creation() 