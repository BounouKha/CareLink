from rest_framework import serializers
from django.utils import timezone
from CareLink.models import ServiceDemand, Service, Patient, Provider, ServiceDemandPrescription
from account.serializers.user import UserSerializer
from account.serializers.service import ServiceSerializer
from account.serializers.patient import PatientSerializer, PatientWithUserSerializer

class ServiceDemandSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)
    managed_by_name = serializers.CharField(source='managed_by.get_full_name', read_only=True)
    assigned_provider_name = serializers.CharField(source='assigned_provider.user.get_full_name', read_only=True)
    
    class Meta:
        model = ServiceDemand
        fields = [
            'id', 'patient', 'patient_name', 'sent_by', 'sent_by_name', 'service', 'service_name',
            'title', 'description', 'reason', 'priority', 'preferred_start_date', 'frequency',
            'duration_weeks', 'preferred_time', 'contact_method', 'special_instructions',
            'status', 'managed_by', 'managed_by_name', 'assigned_provider', 'assigned_provider_name',
            'coordinator_notes', 'rejection_reason', 'estimated_cost', 'created_at', 'updated_at',
            'reviewed_at', 'completed_at', 'is_urgent', 'days_since_created'
        ]
        read_only_fields = ['created_at', 'updated_at', 'reviewed_at', 'completed_at', 'is_urgent', 'days_since_created']
    
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
            'patient', 'sent_by', 'service', 'title', 'description', 'reason', 'priority',
            'preferred_start_date', 'frequency', 'duration_weeks', 'preferred_time',
            'contact_method', 'special_instructions'
        ]
    
    def create(self, validated_data):
        # Set sent_by to the current user
        validated_data['sent_by'] = self.context['request'].user
        return super().create(validated_data)


class ServiceDemandPrescriptionSerializer(serializers.ModelSerializer):
    """Serializer for prescription file uploads"""
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = ServiceDemandPrescription
        fields = [
            'id', 'service_demand', 'file', 'file_url', 'file_name', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'description',
            'file_extension', 'is_image', 'is_pdf'
        ]
        read_only_fields = ['uploaded_at', 'file_extension', 'is_image', 'is_pdf', 'file_name', 'file_size', 'uploaded_by']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def validate_file(self, value):
        # Max file size: 10MB
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        
        # Allowed file types
        allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
        file_extension = value.name.split('.')[-1].lower()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '{file_extension}' not allowed. "
                f"Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value
    
    def create(self, validated_data):
        # Set file metadata
        file = validated_data['file']
        validated_data['file_name'] = file.name
        validated_data['file_size'] = file.size
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)
