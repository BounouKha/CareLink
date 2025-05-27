from rest_framework import serializers
from CareLink.models import PhoneUser

class PhoneUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneUser
        fields = ['id', 'phone_number', 'name', 'is_primary']
