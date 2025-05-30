from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import Administrative, FamilyPatient, SocialAssistant, Provider, User, Patient, Coordinator

class CheckUserRoleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id, role):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if role.lower() == "administrator":
            return Response({"error": "Verification for administrator role is not allowed."}, status=403)

        model_mapping = {
            "patient": Patient,
            "coordinator": Coordinator,
            "family patient": FamilyPatient,
            "social assistant": SocialAssistant,
            "provider": Provider,
            "administrative": Administrative,
        }

        model = model_mapping.get(role.lower())
        if not model:
            return Response({"error": "Invalid role specified."}, status=400)

        exists = model.objects.filter(user=user).exists()

        if exists:
            return Response({"message": "Profile for this role already exists."}, status=200)
        else:
            return Response({"message": "No profile found for this role. User can complete a form."}, status=200)