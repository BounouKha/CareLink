from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User, UserActionLog
from django.contrib.auth.hashers import make_password
from django.utils import timezone
import json

def log_user_action(user, action_type, target_model, target_id, target_user=None, description=None, additional_data=None):
    """
    Enhanced logging function for user management actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_USER, EDIT_USER, DELETE_USER)
        target_model: Model name (User)
        target_id: ID of the target object
        target_user: User object being acted upon
        description: Optional description of the action
        additional_data: Optional dict with additional context
    """
    log_data = {
        'user': user,
        'action_type': action_type,
        'target_model': target_model,
        'target_id': target_id,
        'description': description,
        'additional_data': json.dumps(additional_data) if additional_data else None
    }
    
    # For user actions, we can add the target user as "affected patient" if they have patient profile
    # or store their basic info in additional_data
    if target_user:
        if not additional_data:
            additional_data = {}
        additional_data.update({
            'target_user_email': target_user.email,
            'target_user_name': f"{target_user.firstname} {target_user.lastname}",
            'target_user_role': target_user.role,
            'target_user_active': target_user.is_active
        })
        log_data['additional_data'] = json.dumps(additional_data)
        
        # Try to get patient info if target user has a patient profile
        try:
            from CareLink.models import Patient
            patient = Patient.objects.get(user=target_user)
            log_data['affected_patient_id'] = patient.id
            log_data['affected_patient_name'] = f"{target_user.firstname} {target_user.lastname}"
        except Patient.DoesNotExist:
            # Not a patient, that's fine
            pass
            
        # Try to get provider info if target user has a provider profile
        try:
            from CareLink.models import Provider
            provider = Provider.objects.get(user=target_user)
            log_data['affected_provider_id'] = provider.id
            log_data['affected_provider_name'] = f"{target_user.firstname} {target_user.lastname}"
        except Provider.DoesNotExist:
            # Not a provider, that's fine
            pass
    
    UserActionLog.objects.create(**log_data)

class EditUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        # Check if the user is a superuser
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        # Update user fields
        
        data = request.data
        if "lastname" in data:
            user.lastname = data["lastname"]
        if "firstname" in data:
            user.firstname = data["firstname"] 
        if "email" in data:
            user.email = data["email"]    
        if "is_superuser" in data:
            user.is_superuser = data["is_superuser"]
        if "password" in data:
            user.password = make_password(data["password"])
        if "address" in data:
            user.address = data["address"]
        if "is_active" in data:
            user.is_active = data["is_active"]
        if "is_staff" in data:
            user.is_staff = data["is_staff"]
        if "national_number" in data:
            user.national_number = data["national_number"]
        if "role" in data:
            user.role = data["role"]        
        if "birthdate" in data:
            from datetime import datetime
            user.birthdate = datetime.strptime(data["birthdate"], '%Y-%m-%d') if data["birthdate"] else None

        user.save()        # Log the user edit action with enhanced details
        changes_made = list(data.keys())
        log_user_action(
            user=request.user,
            action_type="EDIT_USER",
            target_model="User",
            target_id=user.id,
            target_user=user,
            description=f"Updated user {user.firstname} {user.lastname} ({user.email}) - modified: {', '.join(changes_made)}",
            additional_data={
                "updated_fields": changes_made,
                "updated_via": "admin_panel",
                "total_changes": len(changes_made),
                "timestamp": timezone.now().isoformat()
            }
        )
        
        return Response({
            "message": "User updated successfully.",
            "user": {
                "id": user.id,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "email": user.email,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "is_staff": user.is_staff,
                "national_number": user.national_number,
                "address": user.address,
                "role": user.role,
                "birthdate": user.birthdate.strftime('%Y-%m-%d') if user.birthdate else None,
            }
        })
