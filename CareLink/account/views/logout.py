from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Try to get refresh token from request body first (existing behavior)
            refresh_token = request.data.get("refresh")
            
            # 🍪 If no refresh token in body, try to get from cookie
            if not refresh_token:
                refresh_token = request.COOKIES.get('carelink_refresh')
            
            if not refresh_token:
                return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Blacklist the token (existing security behavior)
            token = RefreshToken(refresh_token)
            token.blacklist()

            # Create response with success message
            response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
            
            # 🍪 Clear the refresh token cookie
            response.delete_cookie(
                'carelink_refresh',
                path='/',
                samesite='Strict'
            )
            
            print("[DEBUG] 🍪 Refresh token cookie cleared")
            return response
            
        except Exception as e:
            # Create error response
            response = Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
            
            # 🍪 Clear cookie even on error (security best practice)
            response.delete_cookie(
                'carelink_refresh',
                path='/',
                samesite='Strict'
            )
            
            return response
