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

def cleanup_duplicate_consents(email="bob@sull.be"):
    """Clean up duplicate active consents for a user"""
    
    print(f"=== CLEANING UP DUPLICATE CONSENTS FOR {email} ===")
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        return
    
    # Get all active consents for this user
    active_consents = CookieConsent.objects.filter(
        user=user,
        withdrawn_at__isnull=True,
        expiry_date__gt=timezone.now()
    ).order_by('-consent_timestamp')
    
    print(f"📊 Active consents found: {active_consents.count()}")
    
    if active_consents.count() <= 1:
        print("✅ No duplicates to clean up")
        return
    
    # Keep the most recent consent, mark others as superseded
    most_recent = active_consents.first()
    duplicates = active_consents[1:]  # All except the first (most recent)
    
    print(f"🔄 Keeping most recent consent: ID {most_recent.id} ({most_recent.consent_timestamp})")
    print(f"🗑️  Marking {len(duplicates)} older consents as superseded:")
    
    for consent in duplicates:
        print(f"   - ID {consent.id}: {consent.consent_timestamp}")
        consent.withdrawn_at = timezone.now()
        consent.withdrawal_reason = "Superseded - duplicate consent cleanup"
        consent.save()
    
    print(f"✅ Cleanup completed. {len(duplicates)} consents marked as superseded")
    
    # Verify cleanup
    remaining_active = CookieConsent.objects.filter(
        user=user,
        withdrawn_at__isnull=True,
        expiry_date__gt=timezone.now()
    ).count()
    
    print(f"🎯 Remaining active consents: {remaining_active}")
    
    if remaining_active == 1:
        print("✅ SUCCESS: Only one active consent remains")
    else:
        print(f"❌ ERROR: Still have {remaining_active} active consents")

if __name__ == "__main__":
    cleanup_duplicate_consents("bob@sull.be")
