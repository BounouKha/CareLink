from rest_framework import serializers
from CareLink.models import PhoneUser
import re

class PhoneUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneUser
        fields = ['id', 'phone_number', 'name', 'is_primary']
        read_only_fields = ['id']

    def validate_phone_number(self, value):
        """Validate phone number format"""
        # Remove any spaces, dashes, or parentheses
        phone = re.sub(r'[\s\-\(\)]', '', value)
        
        # Check if it's a valid phone number (basic validation)
        if not re.match(r'^\+?[1-9]\d{1,14}$', phone):
            raise serializers.ValidationError("Please enter a valid phone number.")
        
        return value

    def validate_name(self, value):
        """Validate description"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Description is required.")
        
        if len(value) > 50:
            raise serializers.ValidationError("Description must be 50 characters or less.")
        
        return value.strip()

    def validate(self, data):
        """Custom validation"""
        # Check for duplicate phone numbers for the same user
        user = self.context['request'].user if 'request' in self.context else None
        
        if user:
            existing_query = PhoneUser.objects.filter(
                user=user, 
                phone_number=data.get('phone_number')
            )
            
            # Exclude current instance if updating
            if self.instance:
                existing_query = existing_query.exclude(pk=self.instance.pk)
            
            if existing_query.exists():
                raise serializers.ValidationError({
                    'phone_number': 'You already have this phone number saved.'
                })
        
        return data
