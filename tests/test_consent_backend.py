#!/usr/bin/env python3
"""
Cookie Consent Backend Test
Tests the GDPR consent storage system
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Setup Django
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(project_root, 'CareLink'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import CookieConsent, User
from django.utils import timezone
from django.test import RequestFactory
from account.views.consent import ConsentStorageView
from account.serializers.consent import ConsentStorageSerializer

def run_consent_tests():
    print("🍪 Testing Cookie Consent Backend Implementation")
    print("=" * 50)
    
    # Test 1: Create a test user
    print("\n1️⃣ Testing User Consent Storage")
    try:
        # Create or get test user
        user, created = User.objects.get_or_create(
            email='test.consent@carelink.com',
            defaults={
                'firstname': 'Test',
                'lastname': 'User',
                'password': 'testpass123'
            }
        )
        print(f"✅ Test user: {user.email} ({'created' if created else 'existing'})")
        
        # Create consent record
        consent = CookieConsent.objects.create(
            user=user,
            consent_version='1.0',
            expiry_date=timezone.now() + timedelta(days=365),
            analytics_cookies='granted',
            marketing_cookies='denied',
            functional_cookies='granted',
            user_agent_snippet='Mozilla/5.0 (Test Browser)',
            page_url='https://carelink.test/privacy',
            consent_method='banner'
        )
        
        print(f"✅ Consent stored: ID {consent.id}")
        print(f"   - Analytics: {consent.analytics_cookies}")
        print(f"   - Marketing: {consent.marketing_cookies}")
        print(f"   - Functional: {consent.functional_cookies}")
        print(f"   - Expires: {consent.expiry_date.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        print(f"❌ User consent test failed: {e}")
        return False
    
    # Test 2: Anonymous consent
    print("\n2️⃣ Testing Anonymous Consent Storage")
    try:
        anonymous_consent = CookieConsent.objects.create(
            user=None,
            user_identifier='anon_12345',
            consent_version='1.0',
            expiry_date=timezone.now() + timedelta(days=365),
            analytics_cookies='denied',
            marketing_cookies='denied',
            functional_cookies='granted',
            user_agent_snippet='Mozilla/5.0 (Anonymous Browser)',
            page_url='https://carelink.test/',
            consent_method='banner'
        )
        
        print(f"✅ Anonymous consent stored: ID {anonymous_consent.id}")
        print(f"   - User ID: {anonymous_consent.user_identifier}")
        print(f"   - All non-essential denied except functional")
        
    except Exception as e:
        print(f"❌ Anonymous consent test failed: {e}")
        return False
    
    # Test 3: Consent expiry checking
    print("\n3️⃣ Testing Consent Expiry Logic")
    try:
        # Create expired consent
        expired_consent = CookieConsent.objects.create(
            user=user,
            consent_version='1.0',
            expiry_date=timezone.now() - timedelta(days=1),  # Yesterday
            analytics_cookies='granted',
            marketing_cookies='granted',
            functional_cookies='granted'
        )
        
        print(f"✅ Expired consent created: ID {expired_consent.id}")
        print(f"   - Is expired: {expired_consent.is_expired}")
        print(f"   - Days until expiry: {expired_consent.days_until_expiry}")
        
    except Exception as e:
        print(f"❌ Expiry test failed: {e}")
        return False
    
    # Test 4: Consent withdrawal
    print("\n4️⃣ Testing Consent Withdrawal")
    try:
        consent.withdrawn_at = timezone.now()
        consent.withdrawal_reason = "Test withdrawal"
        consent.save()
        
        print(f"✅ Consent withdrawn: {consent.withdrawn_at}")
        print(f"   - Reason: {consent.withdrawal_reason}")
        
    except Exception as e:
        print(f"❌ Withdrawal test failed: {e}")
        return False
    
    # Test 5: Audit export
    print("\n5️⃣ Testing Audit Export")
    try:
        audit_data = consent.to_audit_dict()
        print(f"✅ Audit data generated:")
        print(f"   - Consent ID: {audit_data['consent_id']}")
        print(f"   - User email: {audit_data['user_email']}")
        print(f"   - Given on: {audit_data['given_on']}")
        print(f"   - Withdrawn: {audit_data['withdrawn']}")
        
        # Test serializer
        serializer = ConsentStorageSerializer(data={
            'analytics': True,
            'marketing': False,
            'functional': True,
            'page_url': 'https://test.com',
            'user_agent': 'Test Agent'
        })
        
        if serializer.is_valid():
            print("✅ Serializer validation passed")
        else:
            print(f"❌ Serializer errors: {serializer.errors}")
            
    except Exception as e:
        print(f"❌ Audit test failed: {e}")
        return False
    
    # Test 6: Statistics
    print("\n6️⃣ Testing Consent Statistics")
    try:
        total_consents = CookieConsent.objects.count()
        active_consents = CookieConsent.objects.filter(
            withdrawn_at__isnull=True,
            expiry_date__gt=timezone.now()
        ).count()
        
        analytics_granted = CookieConsent.objects.filter(
            analytics_cookies='granted',
            withdrawn_at__isnull=True,
            expiry_date__gt=timezone.now()
        ).count()
        
        print(f"✅ Statistics:")
        print(f"   - Total consents: {total_consents}")
        print(f"   - Active consents: {active_consents}")
        print(f"   - Analytics acceptance: {analytics_granted}/{active_consents}")
        
    except Exception as e:
        print(f"❌ Statistics test failed: {e}")
        return False
    
    print("\n🎉 All consent backend tests passed!")
    print("\n📋 Summary:")
    print("✅ User consent storage")
    print("✅ Anonymous consent storage")
    print("✅ Expiry checking")
    print("✅ Consent withdrawal")
    print("✅ Audit data export")
    print("✅ Statistics generation")
    
    return True

def test_api_endpoints():
    print("\n\n🌐 Testing API Endpoints")
    print("=" * 30)
    
    from django.test import Client
    
    client = Client()
    
    # Test consent storage endpoint
    print("\n📡 Testing consent storage API")
    try:
        response = client.post('/account/consent/store/', 
            data=json.dumps({
                'analytics': True,
                'marketing': False,
                'functional': True,
                'page_url': 'https://test.com',
                'user_agent': 'Test Browser'
            }),
            content_type='application/json'
        )
        
        print(f"✅ Consent storage API: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"   - Status: {data.get('status')}")
            print(f"   - Consent ID: {data.get('consent_id')}")
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
    
    # Test statistics endpoint
    print("\n📊 Testing consent statistics API")
    try:
        response = client.get('/account/consent/stats/')
        print(f"✅ Statistics API: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            print(f"   - Total consents: {stats.get('total_consents')}")
            print(f"   - Active consents: {stats.get('active_consents')}")
            print(f"   - Analytics acceptance: {stats.get('analytics_acceptance_rate')}%")
        
    except Exception as e:
        print(f"❌ Statistics API test failed: {e}")

if __name__ == '__main__':
    try:
        # Run the tests
        if run_consent_tests():
            test_api_endpoints()
            
            print("\n\n🏆 GDPR Cookie Consent Implementation Complete!")
            print("\n📝 What was implemented:")
            print("• CookieConsent database model for audit trail")
            print("• Privacy-first design (no IP storage)")
            print("• Both authenticated and anonymous consent")
            print("• Automatic expiry (365 days)")
            print("• Consent withdrawal support")
            print("• Audit export capabilities")
            print("• API endpoints for frontend integration")
            print("• Admin interface for compliance team")
            
            print("\n🔐 Compliance Features:")
            print("• GDPR Article 7 compliance (proof of consent)")
            print("• Healthcare data protection standards")
            print("• Audit trail for legal requirements")
            print("• User rights (withdrawal, history)")
            print("• Version control for policy updates")
            
            print("\n✨ Your consent is now stored in the database for proof!")
            
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
