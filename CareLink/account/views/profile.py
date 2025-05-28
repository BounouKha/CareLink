from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import MedicalFolder
from account.serializers.phoneuser import PhoneUserSerializer
from account.serializers.user import UserSerializer
from account.serializers.familypatient import FamilyPatientSerializer
from account.serializers.patient import PatientSerializer
from account.serializers.medicalfolder import MedicalFolderSerializer   
from django.http import JsonResponse

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Debugging: Log user and authentication details
        print("[DEBUG] User:", request.user)
        print("[DEBUG] Auth:", request.auth)

        if not request.user.is_authenticated:
            print("[DEBUG] User is not authenticated.")
            return JsonResponse({"error": "User is not authenticated."}, status=401)

        user = request.user
        print("[DEBUG] Authenticated user details:", user)
        serializer = UserSerializer(user)
        phone_numbers = user.phone_numbers.all()
        family_list = user.family_patients.all()
        phone_serializer = PhoneUserSerializer(phone_numbers, many=True)
        family_serializer = FamilyPatientSerializer(family_list, many=True)
        
        # Add patient info if user is a patient
        patient_data = None
        if user.role == 'Patient':
            from CareLink.models import Patient
            try:
                patient = Patient.objects.get(user=user)
                patient_data = PatientSerializer(patient).data
            except Patient.DoesNotExist:
                patient_data = None

        
        # Add medical folder data
        from CareLink.models import MedicalFolder
        from account.serializers.medicalfolder import MedicalFolderSerializer
        medical_folder_data = []
        try:
            if patient_data:  # Ensure the user is a patient
                medical_folders = MedicalFolder.objects.filter(patient__user=user)
                medical_folder_data = MedicalFolderSerializer(medical_folders, many=True).data
        except MedicalFolder.DoesNotExist:
            medical_folder_data = []

        response_data = {
            "user": serializer.data,
            "phone_numbers": phone_serializer.data,
            "family": family_serializer.data,
            "patient": patient_data,
            "medical_folder": medical_folder_data
        }
        
        return Response(response_data)