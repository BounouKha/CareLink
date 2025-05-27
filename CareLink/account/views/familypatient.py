from rest_framework.viewsets import ModelViewSet
from CareLink.models import FamilyPatient
from account.serializers.familypatient import FamilyPatientSerializer

class FamilyPatientViewSet(ModelViewSet):
    queryset = FamilyPatient.objects.all()
    serializer_class = FamilyPatientSerializer
