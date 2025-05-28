from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from CareLink.models import User
from django.contrib.auth.hashers import make_password

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
        user.save()
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
