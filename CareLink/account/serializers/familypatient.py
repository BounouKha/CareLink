from rest_framework import serializers
from CareLink.models import FamilyPatient, Patient, User
from account.serializers.user import UserSerializer
from account.serializers.patient import PatientSerializer

class FamilyPatientSerializer(serializers.ModelSerializer):
    # For reading: return full nested data
    patient_detail = serializers.SerializerMethodField()
    user_detail = serializers.SerializerMethodField()
    
    # For writing: accept IDs
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=False, allow_null=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=False, allow_null=True)

    class Meta:
        model = FamilyPatient
        fields = ['id', 'link', 'patient', 'user', 'patient_detail', 'user_detail']

    def get_patient_detail(self, obj):
        """Return full patient data for reading"""
        if obj.patient:
            return PatientSerializer(obj.patient).data
        return None

    def get_user_detail(self, obj):
        """Return full user data for reading"""
        if obj.user:
            user_data = UserSerializer(obj.user).data
            user_data['full_name'] = f"{obj.user.firstname} {obj.user.lastname}"  # Add full name
            return user_data
        return None

    def to_representation(self, instance):
        """Customize the output representation"""
        ret = super().to_representation(instance)
        # For backward compatibility, also include patient/user as nested objects
        ret['patient'] = ret.pop('patient_detail', None)
        ret['user'] = ret.pop('user_detail', None)
        return ret