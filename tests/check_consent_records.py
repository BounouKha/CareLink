import os
import sys
import django

# Add the CareLink directory to Python path
sys.path.append(r'C:\Users\460020779\Desktop\CareLink\CareLink')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import CookieConsent
from CareLink.models import User
from django.utils import timezone

print("=== CONSENT RECORDS ANALYSIS ===")
print(f"Current time: {timezone.now()}")
print()

# Get all consents ordered by timestamp
consents = CookieConsent.objects.all().order_by('-consent_timestamp')
print(f"Total consent records: {consents.count()}")
print()

print("Recent consent records:")
print("-" * 80)
for i, consent in enumerate(consents[:10]):
    user_email = consent.user.email if consent.user else "Anonymous"
    status = "WITHDRAWN" if consent.withdrawn_at else "ACTIVE"
    if consent.expiry_date <= timezone.now():
        status = "EXPIRED"
    
    print(f"{i+1:2d}. ID: {consent.id:3d} | User: {user_email:20s} | {consent.consent_timestamp} | {status:9s}")
    print(f"     Analytics: {consent.analytics_cookies:8s} | Marketing: {consent.marketing_cookies:8s} | Functional: {consent.functional_cookies:8s}")
    if consent.withdrawn_at:
        print(f"     Withdrawn: {consent.withdrawn_at} | Reason: {consent.withdrawal_reason}")
    print()

# Check for today's consents
today = timezone.now().date()
today_consents = consents.filter(consent_timestamp__date=today)
print(f"Consents created today ({today}): {today_consents.count()}")

if today_consents.count() > 0:
    print("Today's consents:")
    for consent in today_consents:
        user_email = consent.user.email if consent.user else "Anonymous"
        print(f"  - {consent.consent_timestamp} | {user_email} | ID: {consent.id}")
