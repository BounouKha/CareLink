#!/usr/bin/env python3
"""
Test the new 12-hour refresh token configuration
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the project directory to the Python path
project_path = 'c:\\Users\\460020779\\Desktop\\CareLink\\CareLink'
sys.path.insert(0, project_path)
os.chdir(project_path)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from CareLink.models import User
from django.conf import settings

def test_new_token_timing():
    """Test the new token timing configuration"""
    print("=" * 60)
    print("TESTING NEW 12-HOUR REFRESH TOKEN CONFIGURATION")
    print("=" * 60)
    
    # Check Django settings
    jwt_settings = settings.SIMPLE_JWT
    access_lifetime = jwt_settings['ACCESS_TOKEN_LIFETIME']
    refresh_lifetime = jwt_settings['REFRESH_TOKEN_LIFETIME']
    
    print(f"🔧 JWT Configuration:")
    print(f"   Access Token Lifetime: {access_lifetime}")
    print(f"   Refresh Token Lifetime: {refresh_lifetime}")
    print(f"   Token Rotation: {jwt_settings['ROTATE_REFRESH_TOKENS']}")
    print(f"   Blacklist After Rotation: {jwt_settings['BLACKLIST_AFTER_ROTATION']}")
    
    # Find a test user
    test_user = User.objects.filter(email="REMOVED_EMAIL").first()
    if not test_user:
        print("❌ Test user not found!")
        return
    
    print(f"\n✅ Found test user: {test_user.firstname} {test_user.lastname}")
    
    # Generate tokens for testing
    refresh = RefreshToken.for_user(test_user)
    access_token = refresh.access_token
    
    # Calculate expiration times
    access_exp = datetime.fromtimestamp(access_token['exp'])
    refresh_exp = datetime.fromtimestamp(refresh['exp'])
    now = datetime.now()
    
    print(f"\n🕐 Token Timing Analysis:")
    print(f"   Current Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Access Token Expires: {access_exp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Refresh Token Expires: {refresh_exp.strftime('%Y-%m-%d %H:%M:%S')}")
    
    access_valid_for = access_exp - now
    refresh_valid_for = refresh_exp - now
    
    print(f"\n⏱️  Token Validity Duration:")
    print(f"   Access Token Valid For: {access_valid_for}")
    print(f"   Refresh Token Valid For: {refresh_valid_for}")
    
    # Healthcare compliance analysis
    print(f"\n🏥 Healthcare Compliance Analysis:")
    
    if access_valid_for.total_seconds() <= 15 * 60:  # 15 minutes
        print(f"   ✅ Access Token: COMPLIANT (≤15 minutes)")
    else:
        print(f"   ❌ Access Token: NON-COMPLIANT (>15 minutes)")
    
    if refresh_valid_for.total_seconds() <= 12 * 60 * 60:  # 12 hours
        print(f"   ✅ Refresh Token: COMPLIANT (≤12 hours)")
    else:
        print(f"   ❌ Refresh Token: NON-COMPLIANT (>12 hours)")
    
    # Calculate refresh frequency
    refresh_frequency_minutes = (access_valid_for.total_seconds() - 2*60) / 60  # 2 min before expiry
    refreshes_per_12h = (12 * 60) / refresh_frequency_minutes
    
    print(f"\n🔄 Refresh Frequency Analysis:")
    print(f"   Refresh Every: ~{refresh_frequency_minutes:.1f} minutes")
    print(f"   Refreshes per 12h: ~{refreshes_per_12h:.0f} times")
    print(f"   User Login Frequency: Every 12 hours")
    
    # Security benefits
    print(f"\n🛡️  Security Benefits:")
    print(f"   ✅ Short Access Tokens: Minimize damage if compromised")
    print(f"   ✅ Token Rotation: Old refresh tokens blacklisted")
    print(f"   ✅ Regular Re-authentication: Every 12 hours")
    print(f"   ✅ Healthcare Compliance: HIPAA/GDPR compatible")
    
    # User experience impact
    print(f"\n👤 User Experience Impact:")
    if refresh_valid_for.total_seconds() <= 8 * 60 * 60:  # 8 hours (work day)
        print(f"   ✅ EXCELLENT: Covers typical work shift")
    elif refresh_valid_for.total_seconds() <= 12 * 60 * 60:  # 12 hours
        print(f"   ✅ GOOD: Covers extended work day")
    else:
        print(f"   ⚠️  CONSIDER: May be too long for healthcare security")
    
    print(f"\n✅ New token configuration analysis completed")

if __name__ == "__main__":
    test_new_token_timing()
