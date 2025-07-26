from rest_framework import serializers  
from CareLink.models import User, EmailVerification
from django.core.validators import validate_email
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import re  # For password complexity validation
import random
import string


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'firstname', 'lastname', 'birthdate', 'address', 'national_number', 'role']
    
    def validate_email(self, value):
        # Validate email format
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Invalid email format.")
        
        # Check if email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
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
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    def create(self, validated_data):
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
