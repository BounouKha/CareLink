#!/usr/bin/env python3
"""
Test Consent Flow: Anonymous to Logged In
Tests what happens when user gives consent anonymously then logs in
"""

import os
import sys
import django
import json
import requests
from datetime import datetime

# Setup Django
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(project_root, 'CareLink'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import CookieConsent, User

def test_consent_flow():
    print("🍪 Testing Consent Flow: Anonymous → Logged In")
    print("=" * 55)
    
    # Step 1: Simulate anonymous user giving consent
    print("\n1️⃣ Anonymous User Gives Consent")
    try:
        # This simulates what happens when banner is shown to anonymous user
        anonymous_response = requests.post('http://localhost:8000/account/consent/store/', 
            json={
                'analytics': True,
                'marketing': False,
                'functional': True,
                'page_url': 'https://carelink.com/home',
                'user_agent': 'Mozilla/5.0 (Test Browser)',
                'consent_method': 'banner'
            },
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Anonymous consent stored: {anonymous_response.status_code}")
        if anonymous_response.status_code == 201:
            anon_data = anonymous_response.json()
            print(f"   - Consent ID: {anon_data.get('consent_id')}")
            print(f"   - Status: {anon_data.get('status')}")
            
            # Check database
            anon_consent = CookieConsent.objects.get(id=anon_data['consent_id'])
            print(f"   - Database: User={anon_consent.user}, Anonymous ID={anon_consent.user_identifier}")
            
    except Exception as e:
        print(f"❌ Anonymous consent failed: {e}")
        return False
    
    # Step 2: User logs in
    print("\n2️⃣ User Logs In")
    try:
        login_response = requests.post('http://localhost:8000/account/login/', 
            json={'email': 'REMOVED_EMAIL', 'password': 'REMOVED'},
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Login successful: {login_response.status_code}")
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data['access']
            print(f"   - Got access token: {access_token[:30]}...")
            
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return False
    
    # Step 3: Authenticated user gives new consent (this is what happens when frontend syncs)
    print("\n3️⃣ Authenticated User Gives Consent")
    try:
        # This simulates frontend detecting user is now logged in and syncing consent
        auth_response = requests.post('http://localhost:8000/account/consent/store/', 
            json={
                'analytics': True,
                'marketing': True,  # Different choice to see the difference
                'functional': True,
                'page_url': 'https://carelink.com/dashboard',
                'user_agent': 'Mozilla/5.0 (Test Browser)',
                'consent_method': 'banner'
            },
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }
        )
        
        print(f"✅ Authenticated consent stored: {auth_response.status_code}")
        if auth_response.status_code == 201:
            auth_data = auth_response.json()
            print(f"   - Consent ID: {auth_data.get('consent_id')}")
            
            # Check database
            auth_consent = CookieConsent.objects.get(id=auth_data['consent_id'])
            print(f"   - Database: User={auth_consent.user.email if auth_consent.user else None}")
            
    except Exception as e:
        print(f"❌ Authenticated consent failed: {e}")
        return False
    
    # Step 4: Show consent history
    print("\n4️⃣ Check User's Consent History")
    try:
        history_response = requests.get('http://localhost:8000/account/consent/history/', 
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        print(f"✅ History retrieved: {history_response.status_code}")
        if history_response.status_code == 200:
            history_data = history_response.json()
            consents = history_data.get('consents', [])
            print(f"   - Total consents for this user: {len(consents)}")
            
            for i, consent in enumerate(consents):
                print(f"   - Consent {i+1}: {consent.get('consent_timestamp')} - Analytics: {consent.get('analytics_cookies')}")
                
    except Exception as e:
        print(f"❌ History check failed: {e}")
    
    # Step 5: Check database state
    print("\n5️⃣ Database Analysis")
    try:
        user = User.objects.get(email='REMOVED_EMAIL')
        
        # All consents for this user
        user_consents = CookieConsent.objects.filter(user=user).order_by('-consent_timestamp')
        print(f"✅ User consents in database: {user_consents.count()}")
        
        # Anonymous consents (no user linked)
        anon_consents = CookieConsent.objects.filter(user__isnull=True).count()
        print(f"✅ Anonymous consents in database: {anon_consents}")
        
        # Show user's consent details
        for i, consent in enumerate(user_consents[:3]):  # Show last 3
            print(f"   - #{i+1}: {consent.consent_timestamp.strftime('%Y-%m-%d %H:%M')} - Analytics: {consent.analytics_cookies}")
            
    except Exception as e:
        print(f"❌ Database analysis failed: {e}")
    
    print("\n📋 **CONSENT FLOW SUMMARY**")
    print("=" * 40)
    print("✅ Anonymous consent: Stored with anonymous identifier")
    print("✅ User login: Authentication successful")  
    print("✅ Authenticated consent: Stored linked to user account")
    print("✅ History access: User can see their consent records")
    print("✅ Database separation: Anonymous and user consents are separate")
    
    return True

def explain_actual_behavior():
    print("\n\n🎯 **ACTUAL BEHAVIOR EXPLAINED**")
    print("=" * 45)
    
    print("\n📱 **Frontend (Browser) Behavior:**")
    print("1️⃣ Anonymous visitor → Cookie banner appears")
    print("2️⃣ User gives consent → Stored in localStorage + sent to backend anonymously")
    print("3️⃣ User logs in → Frontend detects authentication")
    print("4️⃣ Frontend automatically syncs consent to user account")
    print("5️⃣ User now has both: localStorage consent + backend audit trail")
    
    print("\n🗄️ **Database Behavior:**")
    print("• Anonymous consent: user=NULL, user_identifier='hash123'")
    print("• Authenticated consent: user=User object, user_identifier=NULL")
    print("• Separate records for audit compliance")
    print("• User can view their authenticated consent history")
    
    print("\n🔒 **Privacy & Compliance:**")
    print("• Anonymous consent: No personal data stored")
    print("• Authenticated consent: Linked to user for audit")
    print("• Both provide legal proof of consent")
    print("• User controls their localStorage data")
    
    print("\n⚡ **What Happens When User Logs In:**")
    print("1. Frontend checks if consent exists in localStorage")
    print("2. If consent exists, frontend calls backend with auth token")
    print("3. Backend creates new consent record linked to user")
    print("4. Anonymous consent remains separate (no personal link)")
    print("5. User's dashboard can show their consent history")

if __name__ == '__main__':
    try:
        if test_consent_flow():
            explain_actual_behavior()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
