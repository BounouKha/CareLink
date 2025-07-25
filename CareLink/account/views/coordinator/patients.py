from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from CareLink.models import User, Patient




class ViewsPatient(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user has permission to view patients (role-based or admin)
        if not (request.user.is_staff or request.user.is_superuser or 
                request.user.role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']):
            return Response({"error": "Permission denied."}, status=403)

        # Filter out patients with inactive or null users
        patients = Patient.objects.select_related('user').filter(
            user__isnull=False,
            user__is_active=True
        )
        
        patient_data = [
            {
                "id": patient.id,
                "firstname": patient.user.firstname if patient.user else None,
                "lastname": patient.user.lastname if patient.user else None,
                "national_number": patient.user.national_number if patient.user else None,
                "birth_date": patient.user.birthdate if patient.user else None,
                "gender": patient.gender,
                "blood_type": patient.blood_type,
                "emergency_contact": patient.emergency_contact,
                "illness": patient.illness,
                "critical_information": patient.critical_information,
                "medication": patient.medication,
                "social_price": patient.social_price,
                "is_alive": patient.is_alive,
            }
            for patient in patients
        ]

        page_number = request.query_params.get('page', 1)
        paginator = Paginator(patient_data, 50)  # 50 patients per page
        page_obj = paginator.get_page(page_number)        
        
        return Response({
            "results": list(page_obj),
            "next": page_obj.has_next(),
            "previous": page_obj.has_previous(),
        }, status=200)

    def post(self, request):
        # Check if user has permission to create/modify patients (role-based)
        if request.user.role not in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            return Response({"error": "Permission denied."}, status=403)

        # Handle patient creation logic here
        return Response({"message": "Patient created successfully."}, status=201)
