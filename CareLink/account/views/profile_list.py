from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from CareLink.models import User, Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative

class ProfileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profiles = []

        # Fetch profiles from each role table
        role_tables = {
            "Patient": Patient,
            "Coordinator": Coordinator,
            "FamilyPatient": FamilyPatient,
            "SocialAssistant": SocialAssistant,
            "Provider": Provider,
            "Administrative": Administrative,
        }

        for role_name, model in role_tables.items():
            for profile in model.objects.all():
                user = profile.user if hasattr(profile, 'user') else None
                profiles.append({
                    "id": user.id if user else None,
                    "firstname": user.firstname if user else None,
                    "lastname": user.lastname if user else None,
                    "role": role_name,
                })

        # Implement pagination
        page_number = request.query_params.get('page', 1)
        paginator = Paginator(profiles, 50)  # 50 profiles per page
        page_obj = paginator.get_page(page_number)

        return Response({
            "results": list(page_obj),
            "next": page_obj.has_next(),
            "previous": page_obj.has_previous(),
        }, status=200)
