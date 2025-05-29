from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken


from rest_framework_simplejwt.tokens import RefreshToken

class LoginAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        # Debugging: Log email and password
        print("[DEBUG] Email:", email)
        print("[DEBUG] Password:", password)

        if not email or not password:
            print("[DEBUG] Missing email or password.")
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            # Debugging: Log successful authentication
            print("[DEBUG] User authenticated:", user)

            refresh = RefreshToken.for_user(user)
            refresh['is_superuser'] = user.is_superuser  # Embed superuser status in the token
            print("[DEBUG] Access Token:", str(refresh.access_token))
            print("[DEBUG] Refresh Token:", str(refresh))

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_superuser": user.is_superuser,  # Include superuser status
            }, status=status.HTTP_200_OK)
        else:
            # Debugging: Log failed authentication
            print("[DEBUG] Invalid credentials.")
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)