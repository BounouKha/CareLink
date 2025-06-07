from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from CareLink.models import Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative, Service, UserActionLog
# Fetch the Service data using ServiceListView
from account.views.service import ServiceListView
from account.serializers.service import ServiceSerializer  # Import the ServiceSerializer
import json

def log_profile_action(user, action_type, profile, role, description, additional_data=None):
    """
    Enhanced logging function for profile operations with patient/provider context
    """
    affected_patient = None
    affected_provider = None
    
    # Extract patient/provider context based on profile role
    if role == "Patient":
        affected_patient = f"{profile.user.firstname} {profile.user.lastname}" if profile.user else None
    elif role == "Provider":
        affected_provider = f"{profile.user.firstname} {profile.user.lastname}" if profile.user else None
    elif role == "FamilyPatient" and hasattr(profile, 'patient') and profile.patient:
        affected_patient = f"{profile.patient.user.firstname} {profile.patient.user.lastname}" if profile.patient.user else None
    
    # Prepare additional data
    log_data = {
        'role': role,
        'profile_id': profile.id,
        'user_id': profile.user.id if profile.user else None,
        'timestamp': timezone.now().isoformat(),
    }
    
    # Add any additional context data
    if additional_data:
        log_data.update(additional_data)
    
    # Create the enhanced log entry
    UserActionLog.objects.create(
        user=user,
        action_type=action_type,
        target_model=f"{role.lower()}_profile",
        target_id=profile.id,
        description=description,
        affected_patient=affected_patient,
        affected_provider=affected_provider,
        additional_data=json.dumps(log_data) if log_data else None
    )

class FetchProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, profile_id, role):
        role_tables = {
            "Patient": Patient,
            "Coordinator": Coordinator,
            "FamilyPatient": FamilyPatient,
            "SocialAssistant": SocialAssistant,
            "Provider": Provider,
            "Administrative": Administrative,
        }

        model = role_tables.get(role)
        if not model:
            return Response({"error": "Invalid role."}, status=400)

        try:
            profile = model.objects.get(user_id=profile_id)  # Query using user_id instead of id
            if not profile.user or profile.user_id is None:
                return Response({"error": "Profile has an empty or null user_id and cannot be displayed."}, status=400)

            # Handle FamilyPatient serialization
            if role == "FamilyPatient" and profile.patient:
                patient_data = {
                    "id": profile.patient.id,
                    "firstname": profile.patient.user.firstname if profile.patient.user else None,
                    "lastname": profile.patient.user.lastname if profile.patient.user else None,
                }
            else:
                patient_data = None

            # Fetch services using ServiceListView
            service_view = ServiceListView()
            print(f"VOICI LE SERVICE RESPONSE 1", service_view.get(request))
            service_response = service_view.get(request)
            print(f"VOICI LE SERVICE RESPONSE 2", service_response.data)
            service_data = service_response.data

            # Debugging logs to verify serialized services
            print(f"Serialized services: {service_data}")

            # Ensure all Service objects are serialized properly
            service_data = [
                {
                    "id": service.id,
                    "name": service.name,
                    "price": str(service.price),
                    "description": service.description,
                }
                for service in Service.objects.all()
            ]

            # Ensure all Service objects in additional_fields are serialized properly
            additional_fields = {}
            for field in model._meta.fields:
                if field.name not in ["id", "user", "patient"]:
                    value = getattr(profile, field.name)
                    if isinstance(value, Service):
                        additional_fields[field.name] = {
                            "id": value.id,
                            "name": value.name,
                            "price": str(value.price),
                            "description": value.description,
                        }
                    else:
                        additional_fields[field.name] = value

            # Debugging logs to verify serialized additional_fields
            print(f"Serialized additional_fields: {additional_fields}")

            # Include services and serialized additional_fields in the profile response
            data = {
                "id": profile.id,
                "firstname": profile.user.firstname,
                "lastname": profile.user.lastname,
                "patient": patient_data,
                "services": service_data,
                "additional_fields": additional_fields,
            }
            # Debugging logs to inspect the entire response data
            print(f"Final response data: {data}")

            # Debugging logs to inspect the response data
            print(f"Response data before sending: {data}")

            # Ensure no raw Service objects are included in the response
            assert all(isinstance(service, dict) for service in service_data), "Service data contains non-serialized objects"
            assert all(isinstance(value, dict) or not isinstance(value, Service) for value in additional_fields.values()), "Additional fields contain non-serialized Service objects"

            return Response(data, status=200)
        except model.DoesNotExist:
            return Response({"error": "Profile not found."}, status=404)

class EditProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, profile_id, role):
        role_tables = {
            "Patient": Patient,
            "Coordinator": Coordinator,
            "FamilyPatient": FamilyPatient,
            "SocialAssistant": SocialAssistant,
            "Provider": Provider,
            "Administrative": Administrative,
        }

        model = role_tables.get(role)
        if not model:
            return Response({"error": "Invalid role."}, status=400)

        try:
            profile = model.objects.get(id=profile_id)
            
            # Track changes for logging
            changes_made = []
            original_values = {}
            
            for field, value in request.data.items():
                if hasattr(profile, field):
                    if field in ["id", "firstname", "lastname"] and not value:
                        return Response({"error": f"Field '{field}' cannot be empty."}, status=400)
                    
                    # Track the change
                    original_value = getattr(profile, field)
                    if original_value != value:
                        changes_made.append(field)
                        original_values[field] = str(original_value) if original_value is not None else None
                    
                    setattr(profile, field, value)
            
            profile.save()
            
            # Enhanced logging with detailed change tracking
            if changes_made:
                profile_name = f"{profile.user.firstname} {profile.user.lastname}" if profile.user else f"{role} Profile"
                description = f"Updated {role.lower()} profile for {profile_name}. Modified fields: {', '.join(changes_made)}"
                
                additional_data = {
                    'fields_changed': changes_made,
                    'original_values': original_values,
                    'new_values': {field: str(request.data.get(field)) for field in changes_made},
                    'total_changes': len(changes_made)
                }
                
                log_profile_action(
                    user=request.user,
                    action_type="EDIT_PROFILE",
                    profile=profile,
                    role=role,
                    description=description,
                    additional_data=additional_data
                )
            else:
                # Log even if no changes were made
                profile_name = f"{profile.user.firstname} {profile.user.lastname}" if profile.user else f"{role} Profile"
                description = f"Attempted to update {role.lower()} profile for {profile_name} but no changes were detected"
                
                log_profile_action(
                    user=request.user,
                    action_type="EDIT_PROFILE",
                    profile=profile,
                    role=role,
                    description=description,
                    additional_data={'changes_detected': False}
                )
            
            return Response({"message": "Profile updated successfully."}, status=200)
        except model.DoesNotExist:
            return Response({"error": "Profile not found."}, status=404)
