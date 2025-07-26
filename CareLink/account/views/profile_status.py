from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from account.services.profile_verification_service import ProfileVerificationService
import logging

logger = logging.getLogger(__name__)

class ProfileStatusAPIView(APIView):
    """API endpoint to check user's profile status and activation requirements"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's profile status"""
        try:
            user = request.user
            profile_status = ProfileVerificationService.check_user_profile_status(user)
            
            # Get language from request (default to 'en')
            language = request.GET.get('lang', 'en')
            
            # Add waiting message if needed
            if profile_status['waiting_for_activation']:
                profile_status['waiting_message'] = ProfileVerificationService.get_waiting_message(
                    profile_status, language
                )
            
            return Response({
                'success': True,
                'profile_status': profile_status,
                'user_role': user.role,
                'user_name': user.get_full_name()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting profile status for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get profile status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RequestProfileActivationAPIView(APIView):
    """API endpoint to request profile activation (creates helpdesk ticket)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create profile activation request ticket"""
        try:
            user = request.user
            
            # Check if user actually needs activation
            profile_status = ProfileVerificationService.check_user_profile_status(user)
            
            if not profile_status['waiting_for_activation']:
                return Response({
                    'success': False,
                    'message': 'Profile activation not required - your profile is already complete'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create activation ticket
            ticket = ProfileVerificationService.create_profile_activation_ticket(user)
            
            if ticket:
                return Response({
                    'success': True,
                    'message': 'Profile activation request submitted successfully',
                    'ticket_id': ticket.id,
                    'ticket_title': ticket.title
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to create activation request'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error creating profile activation request for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to submit activation request'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
