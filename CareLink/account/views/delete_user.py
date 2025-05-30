from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User, Invoice, Patient
from .check_user import CheckUserRoleView

class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            # Check if the user has a profile
            check_user_role_view = CheckUserRoleView()
            role_check_response = check_user_role_view.get(request, user_id, "patient")

            if role_check_response.status_code == 200 and "No profile found" in role_check_response.data.get("message", ""):
                user.delete()
                return Response({"message": "User deleted successfully. Refreshing page..."}, status=200)

            # Retrieve the patient linked to the user_id
            patient = Patient.objects.get(user=user)

            # Check for unpaid invoices linked to the patient
            unpaid_invoices = Invoice.objects.filter(patient=patient).exclude(status="Paid")
            if unpaid_invoices.exists():
                return Response({"error": "User cannot be deleted due to unpaid invoices."}, status=400)


            user.delete()
            return Response({"message": "User deleted successfully. Refreshing page..."}, status=200)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found for the given user ID."}, status=404)
