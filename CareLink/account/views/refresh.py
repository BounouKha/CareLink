from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger('carelink')

class CustomTokenRefreshView(TokenRefreshView):
    """
    Enhanced Token Refresh View with Security Features
    - Token rotation (new refresh token on each refresh)
    - Blacklisting of old refresh tokens
    - Enhanced logging for security monitoring
    - Proper error handling
    """
    
    def post(self, request, *args, **kwargs):
        try:
            # Extract the old refresh token from the request
            old_refresh_token = request.data.get('refresh')
            
            if not old_refresh_token:
                logger.warning('Token refresh attempted without refresh token')
                return Response(
                    {"error": "Refresh token is required."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                # Validate the old refresh token
                refresh_token = RefreshToken(old_refresh_token)
                user_id = refresh_token.get('user_id')
                
                logger.info(f'Token refresh requested for user {user_id}')
                
                # Check if the token is already blacklisted
                if BlacklistedToken.objects.filter(token=refresh_token).exists():
                    logger.warning(f'Blacklisted token used for refresh attempt by user {user_id}')
                    return Response(
                        {"error": "Token is blacklisted."}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )

                # Proceed with the default refresh logic to get new tokens
                response = super().post(request, *args, **kwargs)
                
                if response.status_code == 200:
                    # Only blacklist the old token if refresh was successful
                    refresh_token.blacklist()
                    logger.info(f'Token refreshed successfully for user {user_id}, old token blacklisted')
                    
                    # Add additional security headers
                    response['X-Token-Refreshed'] = 'true'
                    response['X-Refresh-Time'] = str(refresh_token.current_time)
                    
                else:
                    logger.error(f'Token refresh failed for user {user_id}: {response.data}')
                
                return response
                
            except Exception as token_error:
                logger.error(f'Token validation error during refresh: {token_error}')
                return Response(
                    {"error": "Invalid or expired refresh token."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f'Unexpected error during token refresh: {e}')
            return Response(
                {"error": "Token refresh failed due to server error."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )