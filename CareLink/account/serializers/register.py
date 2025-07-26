from rest_framework import serializers  
from CareLink.models import User, EmailVerification
from django.core.validators import validate_email
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.db import IntegrityError
import re  # For password complexity validation
import random
import string


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=True)
    gdpr_consent = serializers.BooleanField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'firstname', 'lastname', 'birthdate', 'address', 'national_number', 'role', 'gdpr_consent']
    
    def validate_email(self, value):
        # Validate email format
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Please enter a valid email address.")
        
        return value

    def validate_national_number(self, value):
        # Just return the value - uniqueness will be checked in validate()
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value
    
    def validate_gdpr_consent(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the GDPR terms and conditions to create an account.")
        return value

    def validate(self, data):
        # Run parent validation first
        data = super().validate(data)
        
        # Check for email uniqueness with custom message
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                'email': 'This email is already registered. Please use a different email or try logging in.'
            })
        
        # Check for national number uniqueness with custom message
        if data.get('national_number') and User.objects.filter(national_number=data['national_number']).exists():
            raise serializers.ValidationError({
                'national_number': 'This national number is already associated with another account. Please contact support if you believe this is an error.'
            })
        
        return data
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    def create(self, validated_data):
        try:
            # Remove GDPR consent before creating user (don't store it)
            validated_data.pop('gdpr_consent', None)
            
            # Create user with is_active=False
            user = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                firstname=validated_data['firstname'],
                lastname=validated_data['lastname'],
                birthdate=validated_data.get('birthdate'),
                address=validated_data.get('address'),
                national_number=validated_data.get('national_number'),
                role=validated_data['role'],
                is_active=False  # Account inactive until email verification
            )
            
            # Create email verification record
            verification_code = self.generate_verification_code()
            expires_at = timezone.now() + timedelta(minutes=5)  # 5 minutes to verify
            
            EmailVerification.objects.create(
                user=user,
                verification_code=verification_code,
                expires_at=expires_at
            )
            
            return user
            
        except IntegrityError as e:
            error_message = str(e).lower()
            if 'email' in error_message:
                raise serializers.ValidationError({
                    'email': ['This email is already registered. Please use a different email or try logging in.']
                })
            elif 'national_number' in error_message:
                raise serializers.ValidationError({
                    'national_number': ['This national number is already associated with another account. Please contact support if you believe this is an error.']
                })
            else:
                raise serializers.ValidationError({
                    'non_field_errors': ['A user with this information already exists. Please check your details.']
                })
