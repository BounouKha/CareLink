from rest_framework import serializers
from django.utils import timezone
from CareLink.models import ServiceDemand, Service, Patient, Provider
from account.serializers.user import UserSerializer
from account.serializers.service import ServiceSerializer
from account.serializers.patient import PatientSerializer

class ServiceDemandSerializer(serializers.ModelSerializer):
    sent_by_info = UserSerializer(source='sent_by', read_only=True)
    managed_by_info = UserSerializer(source='managed_by', read_only=True)
    service_info = ServiceSerializer(source='service', read_only=True)
    patient_info = PatientSerializer(source='patient', read_only=True)
    days_since_created = serializers.ReadOnlyField()
    is_urgent = serializers.ReadOnlyField()
    
    class Meta:
        model = ServiceDemand
        fields = [
            'id', 'title', 'description', 'reason', 'priority', 'status',
            'preferred_start_date', 'frequency', 'duration_weeks', 'preferred_time',
            'contact_method', 'emergency_contact', 'special_instructions',
            'coordinator_notes', 'rejection_reason', 'estimated_cost',
            'created_at', 'updated_at', 'reviewed_at', 'completed_at',
            'patient', 'sent_by', 'service', 'managed_by', 'assigned_provider',
            'sent_by_info', 'managed_by_info', 'service_info', 'patient_info',
            'days_since_created', 'is_urgent'
        ]
        read_only_fields = ['created_at', 'updated_at', 'days_since_created', 'is_urgent']
    
    def validate_preferred_start_date(self, value):
        if value and value < serializers.DateField().to_internal_value(serializers.DateField().to_representation(timezone.now().date())):
            raise serializers.ValidationError("Preferred start date cannot be in the past.")
        return value
    
    def validate_duration_weeks(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Duration must be positive.")
        return value

class ServiceDemandCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating service demands"""
    
    class Meta:
        model = ServiceDemand
        fields = [
            'patient', 'service', 'title', 'description', 'reason', 'priority',
            'preferred_start_date', 'frequency', 'duration_weeks', 'preferred_time',
            'contact_method', 'emergency_contact', 'special_instructions'
        ]
    
    def create(self, validated_data):
        # Set sent_by to the current user
        validated_data['sent_by'] = self.context['request'].user
        return super().create(validated_data)
