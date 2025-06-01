from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .patients import Patient
from account.serializers.patient import PatientSerializer

class UpdatePatientView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, patient_id):
        if not request.user.has_perm('CareLink.change_patient'):
            return Response({"error": "Permission denied."}, status=403)

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
