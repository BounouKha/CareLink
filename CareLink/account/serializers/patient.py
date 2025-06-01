from rest_framework import serializers
from CareLink.models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'user', 'gender', 'blood_type', 'emergency_contact', 'katz_score', 'it_score',
            'illness', 'critical_information', 'medication', 'social_price', 'is_alive', 'spouse', 'deletion_requested_at'
        ]

class PatientWithUserSerializer(serializers.ModelSerializer):
    """Patient serializer that includes user information for frontend display"""
    firstname = serializers.CharField(source='user.firstname', read_only=True)
    lastname = serializers.CharField(source='user.lastname', read_only=True)
    birthdate = serializers.DateField(source='user.birthdate', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    national_number = serializers.CharField(source='user.national_number', read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'firstname', 'lastname', 'birthdate', 'email', 'national_number',
            'gender', 'blood_type', 'emergency_contact', 'katz_score', 'it_score',
            'illness', 'critical_information', 'medication', 'social_price', 'is_alive'
        ]
