from rest_framework import serializers
from CareLink.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'firstname', 'lastname', 'address', 'national_number','birthdate']
