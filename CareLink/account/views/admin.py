from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from CareLink.models import User
from rest_framework import status
from django.contrib.auth.hashers import make_password

class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Check if the user is a superuser
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        # Fetch all users from the database
        users = User.objects.all()

        # Paginate the user data
        paginator = PageNumberPagination()
        paginator.page_size = 50
        paginated_users = paginator.paginate_queryset(users, request)

        # Transform user data into a structured format
        user_data = [
            {
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
            for user in paginated_users
        ]

        # Return the paginated user data as a response
        return paginator.get_paginated_response(user_data)

class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check if the user is a superuser
        if not request.user.is_superuser:
            return Response(
                {"error": "Access denied. Superuser privileges required."},
                status=403
            )

        # Extract user data from the request
        data = request.data
        try:
            user = User.objects.create(
                firstname=data.get("firstname"),
                lastname=data.get("lastname"),
                email=data.get("email"),
                password=make_password(data.get("password")),
                is_active=data.get("is_active", True),
                is_superuser=data.get("is_superuser", False),
                is_staff=data.get("is_staff", False),
                national_number=data.get("national_number"),
                address=data.get("address"),
                role=data.get("role"),
                birthdate=data.get("birthdate"),
            )
            return Response({"message": "User created successfully.", "user_id": user.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
