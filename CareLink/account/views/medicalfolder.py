from rest_framework.viewsets import ModelViewSet
from CareLink.models import MedicalFolder
from account.serializers.medicalfolder import MedicalFolderSerializer


class MedicalFolderViewSet(ModelViewSet):
    queryset = MedicalFolder.objects.all()
    serializer_class = MedicalFolderSerializer
