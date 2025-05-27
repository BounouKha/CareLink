from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from account.serializers.phoneuser import PhoneUserSerializer
from account.serializers.user import UserSerializer
from account.serializers.familypatient import FamilyPatientSerializer
from django.http import JsonResponse

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Debugging: Log user and authentication details
        print("[DEBUG] User:", request.user)
        print("[DEBUG] Auth:", request.auth)

        if not request.user.is_authenticated:
            print("[DEBUG] User is not authenticated.")
            return JsonResponse({"error": "User is not authenticated."}, status=401)

        user = request.user
        print("[DEBUG] Authenticated user details:", user)
        serializer = UserSerializer(user)
        phone_numbers = user.phone_numbers.all()
        family_list = user.family_patients.all()
        phone_serializer = PhoneUserSerializer(phone_numbers, many=True)
        family_serializer = FamilyPatientSerializer(family_list, many=True)
        response_data = {
            "user": serializer.data,
            "phone_numbers": phone_serializer.data,
            "family": family_serializer.data
        }
        
        return Response(response_data)