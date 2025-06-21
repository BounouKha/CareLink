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
        user = request.user if request and request.user.is_authenticated else None
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
