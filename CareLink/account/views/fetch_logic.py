from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import Patient, Coordinator, FamilyPatient, SocialAssistant, Provider, Administrative, Service, UserActionLog
# Fetch the Service data using ServiceListView
from account.views.service import ServiceListView
from account.serializers.service import ServiceSerializer  # Import the ServiceSerializer

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
            for field, value in request.data.items():
                if hasattr(profile, field):
                    if field in ["id", "firstname", "lastname"] and not value:
                        return Response({"error": f"Field '{field}' cannot be empty."}, status=400)
                    setattr(profile, field, value)
            profile.save()
            
            # Log the profile edit action
            UserActionLog.objects.create(
                user=request.user,
                action_type="EDIT_PROFILE",
                target_model=model._meta.model_name,
                target_id=profile.id
            )
            
            return Response({"message": "Profile updated successfully."}, status=200)
        except model.DoesNotExist:
            return Response({"error": "Profile not found."}, status=404)
