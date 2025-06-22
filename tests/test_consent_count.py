import os
import sys
import django

# Add the CareLink directory to Python path
sys.path.append(r'C:\Users\460020779\Desktop\CareLink\CareLink')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import CookieConsent, User
from django.utils import timezone

def test_user_consent_count(email="REMOVED_EMAIL"):
    """Test to show how many active consents a user has"""
    
    print(f"=== CONSENT COUNT TEST FOR {email} ===")
    print(f"Current time: {timezone.now()}")
    print()
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        return
    
    # Get all consents for this user
    all_consents = CookieConsent.objects.filter(user=user).order_by('-consent_timestamp')
    print(f"📊 Total consents for {email}: {all_consents.count()}")
    
    # Get active consents (not withdrawn, not expired)
    active_consents = CookieConsent.objects.filter(
        user=user,
        withdrawn_at__isnull=True,
        expiry_date__gt=timezone.now()
    ).order_by('-consent_timestamp')
    
    print(f"🟢 Active consents: {active_consents.count()}")
    
    if active_consents.count() > 1:
        print("❌ PROBLEM: Multiple active consents found!")
    elif active_consents.count() == 1:
        print("✅ CORRECT: One active consent found")
    else:
        print("⚠️  No active consents found")
    
    print("\n" + "="*60)
    print("DETAILED CONSENT BREAKDOWN:")
    print("="*60)
    
    for i, consent in enumerate(all_consents[:10], 1):
        status = "ACTIVE"
        if consent.withdrawn_at:
            status = f"WITHDRAWN ({consent.withdrawal_reason[:50]}...)" if len(consent.withdrawal_reason or "") > 50 else f"WITHDRAWN ({consent.withdrawal_reason})"
        elif consent.expiry_date <= timezone.now():
            status = "EXPIRED"
            
        print(f"{i:2d}. ID: {consent.id:3d} | {consent.consent_timestamp} | {status}")
        print(f"     Analytics: {consent.analytics_cookies:8s} | Marketing: {consent.marketing_cookies:8s} | Functional: {consent.functional_cookies:8s}")
        if consent.withdrawn_at:
            print(f"     Withdrawn: {consent.withdrawn_at}")
        print()
    
    # Check for duplicates (same preferences, both active)
    if active_consents.count() > 1:
        print("🔍 ANALYZING ACTIVE CONSENTS FOR DUPLICATES:")
        print("-" * 50)
        
        preferences_groups = {}
        for consent in active_consents:
            pref_key = f"{consent.analytics_cookies}-{consent.marketing_cookies}-{consent.functional_cookies}"
            if pref_key not in preferences_groups:
                preferences_groups[pref_key] = []
            preferences_groups[pref_key].append(consent)
        
        for pref_key, consents in preferences_groups.items():
            if len(consents) > 1:
                print(f"❌ DUPLICATE PREFERENCES '{pref_key}': {len(consents)} consents")
                for consent in consents:
                    print(f"   - ID {consent.id}: {consent.consent_timestamp}")
            else:
                print(f"✅ UNIQUE PREFERENCES '{pref_key}': 1 consent")
        
    print()
    return active_consents.count()

if __name__ == "__main__":
    # Test the current user
    count = test_user_consent_count("REMOVED_EMAIL")
    
    print(f"🎯 RESULT: {count} active consents found")
    if count > 1:
        print("❌ FAILED: Multiple active consents detected")
        print("💡 SOLUTION NEEDED: Implement proper consent deduplication")
    elif count == 1:
        print("✅ PASSED: Correct number of active consents")
    else:
        print("⚠️  WARNING: No active consents found")
