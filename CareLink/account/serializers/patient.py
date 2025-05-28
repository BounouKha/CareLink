from rest_framework import serializers
from CareLink.models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'user', 'gender', 'blood_type', 'emergency_contact', 'katz_score', 'it_score',
            'illness', 'critical_information', 'medication', 'social_price', 'is_alive', 'spouse', 'deletion_requested_at'
        ]
