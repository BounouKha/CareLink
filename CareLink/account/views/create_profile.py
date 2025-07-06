from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User, Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative, Service, UserActionLog
from django.utils import timezone
import json

def log_profile_action(user, action_type, target_model, target_id, profile=None, target_user=None, description=None, additional_data=None):
    """
    Enhanced logging function for profile management actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_PROFILE, EDIT_PROFILE, DELETE_PROFILE)
        target_model: Model name (Patient, Provider, etc.)
        target_id: ID of the target object
        profile: Profile object being acted upon
        target_user: User object associated with the profile
        description: Optional description of the action
        additional_data: Optional dict with additional context
    """
    # Ensure additional_data is JSON serializable
    serializable_data = None
    if additional_data:
        try:
            serializable_data = json.dumps(additional_data)
        except TypeError:
            # If serialization fails, convert to string representation
            serializable_data = str(additional_data)
    
    log_data = {
        'user': user,
        'action_type': action_type,
        'target_model': target_model,
        'target_id': target_id,
        'description': description,
        'additional_data': serializable_data
    }
    
    # Extract user and profile information
    if target_user:
        if not additional_data:
            additional_data = {}
        
        additional_data.update({
            'profile_user_email': target_user.email,
            'profile_user_name': f"{target_user.firstname} {target_user.lastname}",
            'profile_user_role': target_user.role,
            'profile_type': target_model.lower()        })
        log_data['additional_data'] = json.dumps(additional_data)
        
        # If this is a patient profile, add to affected_patient fields
        if target_model.lower() == 'patient':
            log_data['affected_patient_id'] = target_id
            log_data['affected_patient_name'] = f"{target_user.firstname} {target_user.lastname}"
        
        # If this is a provider profile, add to affected_provider fields
        elif target_model.lower() == 'provider':
            log_data['affected_provider_id'] = target_id
            log_data['affected_provider_name'] = f"{target_user.firstname} {target_user.lastname}"
    
    # Add profile-specific information
    if profile and hasattr(profile, '__dict__'):
        profile_data = {}
        
        # Extract common profile fields
        for field in ['is_internal', 'gender', 'service', 'link', 'from_hospital']:
            if hasattr(profile, field):
                value = getattr(profile, field)
                if value is not None:
                    # Handle foreign key fields
                    if hasattr(value, 'name'):
                        profile_data[field] = value.name
                    elif hasattr(value, 'id'):
                        profile_data[field] = f"ID: {value.id}"
                    else:
                        profile_data[field] = str(value)
        
        if profile_data:
            if not additional_data:
                additional_data = {}            
                additional_data['profile_details'] = profile_data
            log_data['additional_data'] = json.dumps(additional_data)
    
    UserActionLog.objects.create(**log_data)

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
        
        # Prepare JSON-serializable data for logging
        log_data = {
            "role_type": role.lower(),
            "created_via": "admin_panel",
            "timestamp": timezone.now().isoformat()
        }
        
        # Convert role_specific_data to JSON-serializable format
        if role_specific_data:
            serializable_data = {}
            for key, value in role_specific_data.items():
                if hasattr(value, 'id'):
                    # Handle foreign key objects
                    serializable_data[key] = f"ID: {value.id}"
                elif hasattr(value, 'name'):
                    # Handle objects with name attribute
                    serializable_data[key] = value.name
                else:
                    # Handle primitive types
                    serializable_data[key] = str(value)
            log_data["profile_data"] = serializable_data
        
        # Log the profile creation action with enhanced logging
        log_profile_action(
            user=request.user,
            action_type="CREATE_PROFILE",
            target_model=model._meta.model_name,
            target_id=profile.id,
            profile=profile,
            target_user=user,
            description=f"Created {role.lower()} profile for {user.firstname} {user.lastname} ({user.email})",
            additional_data=log_data
        )
        
        return Response({"message": "Profile created successfully."}, status=201)
