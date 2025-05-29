from rest_framework import serializers
from CareLink.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'firstname', 'lastname', 'address', 'national_number', 'birthdate', 'role', 'is_superuser']

    def validate_role(self, value):
        if value not in ['Coordinator', 'Patient', 'Provider', 'Social Assistant', 'Family Member', 'Administrative', 'Administrator']:
            raise serializers.ValidationError("Invalid role. Choose a valid role.")
        return value



