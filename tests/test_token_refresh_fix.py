#!/usr/bin/env python3
"""
Test the fixed JWT token refresh functionality
"""

import os
import sys
import requests
import json

# Add the project directory to the Python path
project_path = 'c:\\Users\\460020779\\Desktop\\CareLink\\CareLink'
sys.path.insert(0, project_path)
os.chdir(project_path)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
import django
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from CareLink.models import User

def test_token_refresh():
    """Test token refresh functionality"""
    print("=" * 60)
    print("TESTING TOKEN REFRESH FIX")
    print("=" * 60)
    
    # Find a test user
    test_user = User.objects.filter(email="REMOVED_EMAIL").first()
    if not test_user:
        print("❌ Test user not found!")
        return
    
    print(f"✅ Found test user: {test_user.firstname} {test_user.lastname}")
    
    # Generate tokens for testing
    refresh = RefreshToken.for_user(test_user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    print(f"🔑 Generated test tokens")
    print(f"   Access Token (first 50 chars): {access_token[:50]}...")
    print(f"   Refresh Token (first 50 chars): {refresh_token[:50]}...")
    print(f"   JWT ID (jti): {refresh.get('jti')}")
    print(f"   User ID in token: {refresh.get('user_id')}")
    
    # Test the refresh endpoint
    print(f"\n🧪 Testing token refresh endpoint...")
    
    try:
        response = requests.post('http://localhost:8000/account/token/refresh/', 
                               json={'refresh': refresh_token},
                               headers={'Content-Type': 'application/json'})
        
        print(f"📤 Response Status: {response.status_code}")
        print(f"📤 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Token refresh worked!")
            print(f"   New Access Token (first 50 chars): {data.get('access', 'N/A')[:50]}...")
            print(f"   New Refresh Token (first 50 chars): {data.get('refresh', 'N/A')[:50]}...")
        else:
            print(f"❌ FAILED: Token refresh failed")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"⚠️  WARNING: Could not connect to server. Make sure Django server is running.")
        print(f"   Run: cd CareLink && python manage.py runserver")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print(f"\n✅ Token refresh test completed")

if __name__ == "__main__":
    test_token_refresh()
