#!/usr/bin/env python
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Service, User, Provider

def check_services():
    """Check what services exist in the database"""
    print("=== Available Services ===")
    services = Service.objects.all()
    for service in services:
        print(f"ID: {service.id}, Name: {service.name}, Price: {service.price}")
    
    print("\n=== User 730 Details ===")
    try:
        user = User.objects.get(id=730)
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
        print("User 730 not found")

if __name__ == "__main__":
    check_services() 