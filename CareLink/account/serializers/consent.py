from rest_framework import serializers
from CareLink.models import CookieConsent
from django.utils import timezone
from datetime import timedelta
import hashlib

class CookieConsentSerializer(serializers.ModelSerializer):
    """Serializer for Cookie Consent storage"""
    
    class Meta:
        model = CookieConsent
        fields = [
            'id', 'consent_version', 'consent_timestamp', 'expiry_date',
            'analytics_cookies', 'marketing_cookies', 'functional_cookies',
            'page_url', 'consent_method'
        ]
        read_only_fields = ['id', 'consent_timestamp']

class ConsentStorageSerializer(serializers.Serializer):
    """Serializer for storing new consent (from frontend)"""
      # Consent preferences
    analytics = serializers.BooleanField(default=False)
    marketing = serializers.BooleanField(default=False)
    functional = serializers.BooleanField(default=False)
    
    # Technical details
    page_url = serializers.URLField(required=False, allow_blank=True)
    user_agent = serializers.CharField(required=False, allow_blank=True, max_length=500)
    anonymous_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    consent_method = serializers.ChoiceField(
        choices=[('banner', 'Cookie Banner'), ('settings', 'Settings Page')],
        default='banner'
    )
    
    def create(self, validated_data):
        """Create a new consent record"""
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None        # Check for existing active consent for authenticated users
        if user:
            existing_active = CookieConsent.objects.filter(
                user=user,
                withdrawn_at__isnull=True,
                expiry_date__gt=timezone.now()
            ).order_by('-consent_timestamp').first()
            
            if existing_active:
                # Compare preferences to determine action needed
                current_preferences = {
                    'analytics': validated_data.get('analytics', False),
                    'marketing': validated_data.get('marketing', False),
                    'functional': validated_data.get('functional', False)
                }
                
                existing_preferences = {
                    'analytics': existing_active.analytics_cookies == 'granted',
                    'marketing': existing_active.marketing_cookies == 'granted',  
                    'functional': existing_active.functional_cookies == 'granted'
                }
                
                print(f"🍪 [DEBUG] User {user.email} - Current: {current_preferences}, Existing: {existing_preferences}")
                
                # Check if preferences are identical
                if current_preferences == existing_preferences:
                    # Same preferences - check if it's a rapid duplicate
                    time_diff = timezone.now() - existing_active.consent_timestamp
                    
                    if time_diff.total_seconds() < 300:  # Less than 5 minutes
                        print(f"🍪 [DEBUG] Preventing rapid duplicate - same preferences within 5 minutes")
                        existing_active._was_updated = False
                        return existing_active
                    else:
                        print(f"🍪 [DEBUG] Same preferences but sufficient time passed - no duplicate consent needed")
                        existing_active._was_updated = False
                        return existing_active
                else:
                    # DIFFERENT preferences - GDPR requires new consent record
                    print(f"🍪 [DEBUG] Preferences CHANGED - superseding old consent ID {existing_active.id}")
                    
                    # Mark the old consent as superseded
                    existing_active.withdrawn_at = timezone.now()
                    existing_active.withdrawal_reason = "Superseded by new consent with different preferences"
                    existing_active.save()
                    
                    print(f"🍪 [DEBUG] Old consent ID {existing_active.id} marked as superseded")
                    # Continue to create new consent record below
            else:
                print(f"🍪 [DEBUG] No existing active consent found for user {user.email}")
        else:
            print(f"🍪 [DEBUG] Anonymous user - creating new consent")
        
        # Generate or use anonymous identifier
        user_identifier = None
        if not user:
            # Use provided anonymous_id or generate one
            user_identifier = validated_data.get('anonymous_id')
            if not user_identifier:
                # Fallback: Create a hash of IP + User Agent
                ip = request.META.get('REMOTE_ADDR', '')
                ua = validated_data.get('user_agent', '')
                user_identifier = hashlib.sha256(f"{ip}_{ua}_{timezone.now().isoformat()}".encode()).hexdigest()[:32]
        
        # Convert boolean choices to consent format
        analytics_consent = 'granted' if validated_data.get('analytics', False) else 'denied'
        marketing_consent = 'granted' if validated_data.get('marketing', False) else 'denied'
        functional_consent = 'granted' if validated_data.get('functional', False) else 'denied'
        
        # Set expiry date (365 days from now)
        expiry_date = timezone.now() + timedelta(days=365)
        
        # Create consent record
        consent = CookieConsent.objects.create(
            user=user,
            user_identifier=user_identifier,
            consent_version='1.0',
            expiry_date=expiry_date,
            analytics_cookies=analytics_consent,
            marketing_cookies=marketing_consent,
            functional_cookies=functional_consent,
            user_agent_snippet=validated_data.get('user_agent', '')[:100] if validated_data.get('user_agent') else '',
            page_url=validated_data.get('page_url', ''),
            consent_method=validated_data.get('consent_method', 'banner'),
            ip_address_stored=False  # Never store IP for privacy
        )
        
        return consent

class ConsentAuditSerializer(serializers.Serializer):
    """Serializer for consent audit/export"""
    
    def to_representation(self, instance):
        """Convert consent to audit format"""
        return instance.to_audit_dict()
