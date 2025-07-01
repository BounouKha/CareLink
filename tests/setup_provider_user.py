#!/usr/bin/env python3
"""
Script to create a provider user for testing provider schedule functionality
"""

import os
import sys
import django

# Add the CareLink directory to the Python path (where manage.py is located)
carelink_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CareLink')
sys.path.append(carelink_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from django.contrib.auth import get_user_model
from CareLink.models import Provider, Service

User = get_user_model()

def create_provider_user():
    """Create a provider user with the correct role"""
    
    # Check if service exists
    service, created = Service.objects.get_or_create(
        name='General Care',
        defaults={'description': 'General healthcare services'}
    )
    
    if created:
        print(f"✅ Created service: {service}")
    else:
        print(f"✅ Found existing service: {service}")
    
    # Create or update provider user
    email = 'provider@carelink.be'
    password = 'testpass123'
    
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'firstname': 'Test',
            'lastname': 'Provider',
            'is_active': True
        }
    )
    
    if created:
        user.set_password(password)
        print(f"✅ Created provider user: {email}")
    else:
        print(f"✅ Found existing user: {email}")
    
    # Update user role to Provider
    user.role = 'Provider'
    user.is_active = True
    user.save()
    print(f"✅ Updated user role to Provider")
    
    # Create or update provider profile
    provider, created = Provider.objects.get_or_create(
        user=user,
        defaults={
            'service': service,
            'is_internal': True
        }
    )
    
    if created:
        print(f"✅ Created provider profile for {user.email}")
    else:
        provider.service = service
        provider.is_internal = True
        provider.save()
        print(f"✅ Updated provider profile for {user.email}")
    
    print("\n" + "="*50)
    print("🔑 PROVIDER USER CREDENTIALS")
    print("="*50)
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Role: Provider")
    print(f"User ID: {user.id}")
    print("="*50)
    
    return user

if __name__ == '__main__':
    print("🚀 Setting up provider user for testing...")
    user = create_provider_user()
    print("\n✅ Provider user setup complete!")
    print("\nYou can now test the provider schedule functionality with these credentials.") 