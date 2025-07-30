from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
import logging
import hashlib

logger = logging.getLogger('carelink')

class CustomTokenRefreshView(TokenRefreshView):
    """Enhanced Token Refresh View with Security Features
    - Token rotation (new refresh token on each refresh)
    - Blacklisting of old refresh tokens
    - Enhanced logging for security monitoring
    - Proper error handling
    - Performance optimizations with caching
    - Concurrent refresh prevention"""
    
    def post(self, request, *args, **kwargs):
        try:
            # Extract the old refresh token from the request
            old_refresh_token = request.data.get('refresh')
            
            # If no refresh token in body, try to get from cookie
            if not old_refresh_token:
                old_refresh_token = request.COOKIES.get('carelink_refresh')
                logger.info('Using refresh token from cookie')
            
            if not old_refresh_token:
                logger.warning('Token refresh attempted without refresh token')
                return Response(
                    {"error": "Refresh token is required."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Performance optimization: Prevent concurrent refreshes for same token
            token_hash = hashlib.sha256(old_refresh_token.encode()).hexdigest()[:16]
            cache_key = f"token_refresh_{token_hash}"
            
            if cache.get(cache_key):
                logger.warning('Concurrent token refresh attempt detected')
                return Response(
                    {"error": "Token refresh already in progress."}, 
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Set cache to prevent concurrent refreshes (60 second timeout to handle slow networks)
            cache.set(cache_key, True, 60)
            
            try:
                # Validate the old refresh token
                refresh_token = RefreshToken(old_refresh_token)
                user_id = refresh_token.get('user_id')
                jti = refresh_token.get('jti')  # Get JWT ID
                
                logger.info(f'Token refresh requested for user {user_id}')
                
                # Check if token is blacklisted
                try:
                    outstanding_token = OutstandingToken.objects.select_related().get(jti=jti)
                    if hasattr(outstanding_token, 'blacklistedtoken'):
                        logger.warning(f'Blacklisted token used for refresh attempt by user {user_id}')
                        return Response(
                            {"error": "Token is blacklisted."}, 
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                except OutstandingToken.DoesNotExist:
                    # Token is not in outstanding tokens, which might be okay for some configurations
                    logger.debug(f'Token {jti} not found in outstanding tokens, proceeding with refresh')
                
                # Proceed with the default refresh logic to get new tokens
                response = super().post(request, *args, **kwargs)
                
                if response.status_code == 200:
                    # Add additional security headers
                    response['X-Token-Refreshed'] = 'true'
                    response['X-Refresh-Time'] = str(timezone.now().isoformat())
                    
                    # Note: We don't manually blacklist the old token here because
                    # django-rest-framework-simplejwt with BLACKLIST_AFTER_ROTATION=True
                    # automatically handles token blacklisting when rotation is enabled.
                    # Manual blacklisting was causing race conditions.
                    logger.info(f'Token refreshed successfully for user {user_id} (auto-blacklisting enabled)')
                    
                    # Update refresh token cookie if it was used for the request
                    if 'carelink_refresh' in request.COOKIES:
                        new_refresh_token = response.data.get('refresh')
                        if new_refresh_token:
                            response.set_cookie(
                                'carelink_refresh',
                                new_refresh_token,
                                max_age=12 * 60 * 60,  # 12 hours
                                secure=not getattr(settings, 'DEBUG', False),
                                httponly=True,
                                samesite='Strict',
                                path='/'
                            )
                            logger.info('Updated refresh token cookie')
                    
                else:
                    logger.error(f'Token refresh failed for user {user_id}: {response.data}')
                
                return response
                
            except (TokenError, InvalidToken) as token_error:
                logger.error(f'Token validation error during refresh: {token_error}')
                return Response(
                    {"error": "Invalid or expired refresh token."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except Exception as unexpected_error:
                logger.error(f'Unexpected error during token validation: {unexpected_error}')
                return Response(
                    {"error": "Token refresh failed due to server error."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            finally:
                # Clear the cache lock
                cache.delete(cache_key)
                
        except Exception as e:
            logger.error(f'Unexpected error during token refresh: {e}')
            return Response(
                {"error": "Token refresh failed due to server error."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
