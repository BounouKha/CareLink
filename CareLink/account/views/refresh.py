from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Debugging logs to inspect incoming request and token validation
        print(f"Incoming request data: {request.data}")
        
        # Extract the old refresh token from the request
        old_refresh_token = request.data.get('refresh')

        if old_refresh_token:
            try:
                token = RefreshToken(old_refresh_token)
                print(f"Token validation successful: {token}")
                # Blacklist the old refresh token
                token.blacklist()
            except Exception as e:
                print(f"Token validation error: {e}")
                return Response({"error": "Invalid or expired refresh token."}, status=status.HTTP_400_BAD_REQUEST)

        # Proceed with the default refresh logic
        response = super().post(request, *args, **kwargs)
        return response