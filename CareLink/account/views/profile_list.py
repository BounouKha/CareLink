from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from CareLink.models import User, Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative

class ProfileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profiles = []
        user_profiles_map = {}  # To track users and avoid duplicates

        # Fetch profiles from each role table
        role_tables = {
            "Patient": Patient,
            "Coordinator": Coordinator,
            "SocialAssistant": SocialAssistant,
            "Provider": Provider,
            "Administrative": Administrative,
        }

        # Handle regular role tables (non-FamilyPatient)
        for role_name, model in role_tables.items():
            for profile in model.objects.all():
                user = profile.user if hasattr(profile, 'user') else None
                if user and user.id not in user_profiles_map:
                    user_profiles_map[user.id] = {
                        "id": user.id,
                        "firstname": user.firstname,
                        "lastname": user.lastname,
                        "role": role_name,
                        "relations": []  # For future compatibility
                    }

        # Handle FamilyPatient specially - group multiple relations per user
        family_patients_by_user = {}
        for family_patient in FamilyPatient.objects.all():
            user = family_patient.user
            if user:
                if user.id not in family_patients_by_user:
                    family_patients_by_user[user.id] = {
                        "id": user.id,
                        "firstname": user.firstname,
                        "lastname": user.lastname,
                        "role": "FamilyPatient",
                        "relations": []
                    }
                
                # Add this relation to the user's relations list
                relation_info = {
                    "link": family_patient.link,
                    "patient_id": family_patient.patient.id if family_patient.patient else None,
                    "patient_name": f"{family_patient.patient.user.firstname} {family_patient.patient.user.lastname}" if family_patient.patient and family_patient.patient.user else None
                }
                family_patients_by_user[user.id]["relations"].append(relation_info)

        # Add unique FamilyPatient users to the profiles map
        for user_id, family_patient_data in family_patients_by_user.items():
            if user_id not in user_profiles_map:
                user_profiles_map[user_id] = family_patient_data

        # Convert the map to a list
        profiles = list(user_profiles_map.values())

        # Implement pagination
        page_number = request.query_params.get('page', 1)
        paginator = Paginator(profiles, 50)  # 50 profiles per page
        page_obj = paginator.get_page(page_number)

        return Response({
            "results": list(page_obj),
            "next": page_obj.has_next(),
            "previous": page_obj.has_previous(),
        }, status=200)
