from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
import logging
from datetime import datetime
from ..services.activity_logger import ActivityLogger

logger = logging.getLogger('carelink')

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get client IP address
        client_ip = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        user = request.user
        
        try:
            # Try to get refresh token from request body first (existing behavior)
            refresh_token = request.data.get("refresh")
            
            # 🍪 If no refresh token in body, try to get from cookie
            if not refresh_token:
                refresh_token = request.COOKIES.get('carelink_refresh')
            
            if not refresh_token:
                logger.warning(
                    f"LOGOUT FAILED - No refresh token provided - "
                    f"User: {user.firstname} {user.lastname} ({user.email}) - "
                    f"IP: {client_ip} - User Agent: {user_agent[:100]}"
                )
                return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Blacklist the token immediately
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # Log successful logout with token blacklisting
            logger.info(
                f"LOGOUT SUCCESSFUL - User: {user.firstname} {user.lastname} "
                f"({user.email}) - Role: {user.role} - IP: {client_ip} - "
                f"User Agent: {user_agent[:100]} - Token blacklisted: YES"
            )
            
            # Log to database for admin panel
            ActivityLogger.log_logout(user, client_ip, user_agent, token_blacklisted=True)

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
            # Log logout error
            logger.error(
                f"LOGOUT ERROR - User: {user.firstname} {user.lastname} "
                f"({user.email}) - IP: {client_ip} - Error: {str(e)}"
            )
            
            # Create error response
            response = Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
            
            # 🍪 Clear cookie even on error (security best practice)
            response.delete_cookie(
                'carelink_refresh',
                path='/',
                samesite='Strict'
            )
            
            return response
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
