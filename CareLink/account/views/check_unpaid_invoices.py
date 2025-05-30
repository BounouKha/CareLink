from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import Patient, Invoice
from .check_user import CheckUserRoleView

class CheckUnpaidInvoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            # Check if the user has a profile
            check_user_role_view = CheckUserRoleView()
            role_check_response = check_user_role_view.get(request, user_id, "patient")

            if role_check_response.status_code == 200 and "No profile found" in role_check_response.data.get("message", ""):
                return Response({"message": "User does not have a profile. No further checks needed."}, status=200)

            # Retrieve the patient linked to the user_id
            patient = Patient.objects.get(user_id=user_id)

            # Check for unpaid invoices linked to the patient
            unpaid_invoices = Invoice.objects.filter(patient=patient).exclude(status="Paid")
            has_unpaid_invoices = unpaid_invoices.exists()

            return Response({"hasUnpaidInvoices": has_unpaid_invoices}, status=200)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found for the given user ID."}, status=404)
