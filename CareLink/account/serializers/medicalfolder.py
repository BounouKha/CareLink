from rest_framework import serializers
from CareLink.models import MedicalFolder

class MedicalFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalFolder
        fields = ['id', 'created_at', 'updated_at', 'note']

