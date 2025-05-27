from rest_framework import serializers
from CareLink.models import FamilyPatient

class FamilyPatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyPatient
        fields = ['id', 'link', 'patient_id', 'user_id']