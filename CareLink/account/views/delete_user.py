from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User, Invoice, Patient, UserActionLog
from .check_user import CheckUserRoleView
from django.utils import timezone
import json

def log_user_action(user, action_type, target_model, target_id, target_user=None, description=None, additional_data=None):
    """
    Enhanced logging function for user management actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_USER, EDIT_USER, DELETE_USER)
        target_model: Model name (User)
        target_id: ID of the target object        target_user: User object being acted upon
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

class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            
            # Check if the user has a profile
            check_user_role_view = CheckUserRoleView()
            role_check_response = check_user_role_view.get(request, user_id, "patient")

            if role_check_response.status_code == 200 and "No profile found" in role_check_response.data.get("message", ""):
                # Log the user deletion action with enhanced logging
                log_user_action(
                    user=request.user,
                    action_type="DELETE_USER",
                    target_model="User",
                    target_id=user.id,
                    target_user=user,
                    description=f"Deleted user {user.firstname} {user.lastname} ({user.email}) - no profile found",
                    additional_data={
                        "deletion_reason": "no_profile_found",
                        "deleted_via": "admin_panel",
                        "timestamp": timezone.now().isoformat()
                    }
                )
                user.delete()
                return Response({"message": "User deleted successfully. Refreshing page..."}, status=200)            # Retrieve the patient linked to the user_id
            patient = Patient.objects.get(user=user)
            
            # Check for unpaid invoices linked to the patient
            unpaid_invoices = Invoice.objects.filter(patient=patient).exclude(status="Paid")
            if unpaid_invoices.exists():
                return Response({"error": "User cannot be deleted due to unpaid invoices."}, status=400)            # Log the user deletion action with enhanced logging
            log_user_action(
                user=request.user,
                action_type="DELETE_USER",
                target_model="User",
                target_id=user.id,
                target_user=user,
                description=f"Deleted user {user.firstname} {user.lastname} ({user.email}) - patient with paid invoices",
                additional_data={
                    "deletion_reason": "patient_with_paid_invoices",
                    "deleted_via": "admin_panel",
                    "invoice_check_passed": True,
                    "timestamp": timezone.now().isoformat()
                }
            )
            
            user.delete()
            return Response({"message": "User deleted successfully. Refreshing page..."}, status=200)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found for the given user ID."}, status=404)
