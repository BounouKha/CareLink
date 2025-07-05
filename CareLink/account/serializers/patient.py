from rest_framework import serializers
from CareLink.models import Patient

class PatientSerializer(serializers.ModelSerializer):
    # Emergency contact info from UserPreferences
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    emergency_contact_relationship = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'user', 'gender', 'blood_type', 'katz_score', 'it_score',
            'illness', 'critical_information', 'medication', 'social_price', 'is_alive', 'spouse', 'deletion_requested_at',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
        ]
    
    def get_emergency_contact_name(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_name
        return ''
    
    def get_emergency_contact_phone(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_phone
        return ''
    
    def get_emergency_contact_relationship(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_relationship
        return ''

class PatientWithUserSerializer(serializers.ModelSerializer):
    """Patient serializer that includes user information for frontend display"""
    firstname = serializers.CharField(source='user.firstname', read_only=True)
    lastname = serializers.CharField(source='user.lastname', read_only=True)
    birthdate = serializers.DateField(source='user.birthdate', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    national_number = serializers.CharField(source='user.national_number', read_only=True)
    
    # Emergency contact info from UserPreferences
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    emergency_contact_relationship = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'firstname', 'lastname', 'birthdate', 'email', 'national_number',
            'gender', 'blood_type', 'katz_score', 'it_score',
            'illness', 'critical_information', 'medication', 'social_price', 'is_alive',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
        ]
    
    def get_emergency_contact_name(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_name
        return ''
    
    def get_emergency_contact_phone(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_phone
        return ''
    
    def get_emergency_contact_relationship(self, obj):
        if obj.user and hasattr(obj.user, 'preferences'):
            return obj.user.preferences.emergency_contact_relationship
        return ''
