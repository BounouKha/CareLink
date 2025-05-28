from rest_framework import serializers
from CareLink.models import FamilyPatient
from account.serializers.user import UserSerializer
from account.serializers.patient import PatientSerializer

class FamilyPatientSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = FamilyPatient
        fields = ['id', 'link', 'patient', 'user']

    def get_patient(self, obj):
        if obj.patient:
            return PatientSerializer(obj.patient).data
        return None

    def get_user(self, obj):
        if obj.user:
            user_data = UserSerializer(obj.user).data
            user_data['full_name'] = f"{obj.user.firstname} {obj.user.lastname}"  # Add full name
            return user_data
        return None