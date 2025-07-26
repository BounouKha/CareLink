from rest_framework import serializers
from CareLink.models import EmailVerification, User
from django.utils import timezone
from datetime import timedelta
import random
import string


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    verification_code = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, data):
        email = data.get('email')
        verification_code = data.get('verification_code')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        
        try:
            verification = EmailVerification.objects.get(user=user)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError("No verification record found for this user.")
        
        if verification.is_verified():
            raise serializers.ValidationError("Email is already verified.")
        
        if verification.is_expired():
            raise serializers.ValidationError("Verification code has expired. Please request a new one.")
        
        if verification.verification_code != verification_code:
            raise serializers.ValidationError("Invalid verification code.")
        
        data['verification'] = verification
        return data
    
    def verify_email(self):
        verification = self.validated_data['verification']
        verification.mark_as_verified()
        return verification.user


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        
        if user.is_active:
            raise serializers.ValidationError("This account is already verified and active.")
        
        try:
            verification = EmailVerification.objects.get(user=user)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError("No verification record found for this user.")
        
        if not verification.can_resend():
            raise serializers.ValidationError("Maximum resend attempts reached. Please contact support.")
        
        self.user = user
        self.verification = verification
        return value
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    def resend_verification(self):
        # Generate new code and extend expiry
        new_code = self.generate_verification_code()
        new_expiry = timezone.now() + timedelta(minutes=5)
        
        self.verification.verification_code = new_code
        self.verification.expires_at = new_expiry
        self.verification.resend_count += 1
        self.verification.save()
        
        return self.user, new_code
