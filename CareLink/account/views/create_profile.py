from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User, Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative, Service, UserActionLog

class CreateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id, role):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if role.lower() == "administrator":
            return Response({"error": "Profile creation for administrator role is not allowed."}, status=403)

        model_mapping = {
            "patient": Patient,
            "coordinator": Coordinator,
            "family-patient": FamilyPatient,
            "family patient": FamilyPatient,
            "social-assistant": SocialAssistant,
            "social assistant": SocialAssistant,
            "provider": Provider,
            "administrative": Administrative,
        }

        model = model_mapping.get(role.lower())
        if not model:
            return Response({"error": "Invalid role specified."}, status=400)

        if model.objects.filter(user=user).exists():
            return Response({"message": "Profile for this role already exists."}, status=400)

        # Extract role-specific data from request
        role_specific_data = request.data.get("role_specific_data", {})
        user_id_from_payload = request.data.get("user_id")

        # Validate user_id consistency
        if str(user_id) != str(user_id_from_payload):
            return Response({"error": "User ID mismatch between URL and payload."}, status=400)

        # Validate role-specific data
        validation_mapping = {
            "patient": ["gender", "blood_type", "emergency_contact", "katz_score", "it_score", "illness", "critical_information", "medication", "social_price", "is_alive"],
            "coordinator": ["is_internal"],
            "family patient": ["patient_id", "link"],
            "social assistant": ["is_internal", "from_hospital"],
            "provider": ["service", "is_internal"],
            "administrative": ["is_internal"],
        }

        # Validate role-specific data
        required_fields = validation_mapping.get(role.lower(), [])
        missing_fields = [field for field in required_fields if field not in role_specific_data]

        if missing_fields:
            return Response({"error": f"Missing required fields: {', '.join(missing_fields)}"}, status=400)

        # Ensure from_hospital is a string
        if role.lower() == "social-assistant" and not isinstance(role_specific_data.get("from_hospital"), str):
            return Response({"error": "Invalid data type for 'from_hospital'. Expected a string."}, status=400)

        # Convert string boolean values to actual booleans
        if role.lower() == "social-assistant":
            if role_specific_data.get("is_internal") in ["true", "True"]:
                role_specific_data["is_internal"] = True
            elif role_specific_data.get("is_internal") in ["false", "False"]:
                role_specific_data["is_internal"] = False

        # Convert service ID to Service instance
        if role.lower() == "provider":
            service_id = role_specific_data.get("service")
            try:
                role_specific_data["service"] = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response({"error": "Invalid service ID."}, status=400)        # Create the profile with role-specific data
        profile = model.objects.create(user=user, **role_specific_data)
        
        # Log the profile creation action
        UserActionLog.objects.create(
            user=request.user,
            action_type="CREATE_PROFILE",
            target_model=model._meta.model_name,
            target_id=profile.id
        )
        
        return Response({"message": "Profile created successfully."}, status=201)
