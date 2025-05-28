from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from CareLink.models import FamilyPatient
from account.serializers.familypatient import FamilyPatientSerializer

class FamilyPatientViewSet(ModelViewSet):
    queryset = FamilyPatient.objects.select_related('patient', 'user').all()
    serializer_class = FamilyPatientSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='by-patient/(?P<patient_id>[^/.]+)')
    def by_patient(self, request, patient_id=None):
        try:
            family_patients = self.queryset.filter(patient__id=patient_id)
            if not family_patients.exists():
                raise NotFound("No family relationships found for the given patient ID.")
            serializer = self.get_serializer(family_patients, many=True)
            return Response(serializer.data)
        except ValueError:
            raise NotFound("Invalid patient ID.")
