from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.http import Http404
from CareLink.models import CookieConsent
from account.serializers.consent import ConsentStorageSerializer, ConsentAuditSerializer, CookieConsentSerializer
import logging

logger = logging.getLogger('carelink')

class ConsentStorageView(APIView):
    """
    Store cookie consent for GDPR compliance
    Both authenticated and anonymous users can store consent
    """
    permission_classes = [permissions.AllowAny]  # Allow anonymous consent
    
    def post(self, request):
        """Store new consent preferences"""
        try:
            serializer = ConsentStorageSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                consent = serializer.save()
                
                # Log consent storage
                user_display = f"{request.user.email}" if request.user.is_authenticated else "Anonymous"
                logger.info(f"Cookie consent stored for {user_display} - ID: {consent.id}")
                
                # Return minimal response (no sensitive data)
                return Response({
                    'status': 'success',
                    'message': 'Consent preferences stored successfully',
                    'consent_id': consent.id,
                    'expires_in_days': consent.days_until_expiry
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'status': 'error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error storing consent: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to store consent preferences'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserConsentHistoryView(APIView):
    """
    Get consent history for authenticated users
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's consent history"""
        try:
            consents = CookieConsent.objects.filter(
                user=request.user
            ).order_by('-consent_timestamp')[:10]  # Last 10 consents
            
            serializer = CookieConsentSerializer(consents, many=True)
            
            return Response({
                'status': 'success',
                'consents': serializer.data,
                'total_count': CookieConsent.objects.filter(user=request.user).count()
            })
            
        except Exception as e:
            logger.error(f"Error fetching consent history for {request.user.email}: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to fetch consent history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConsentWithdrawalView(APIView):
    """
    Withdraw consent (GDPR right to withdraw)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Withdraw most recent consent"""
        try:
            # Get user's most recent active consent
            consent = CookieConsent.objects.filter(
                user=request.user,
                withdrawn_at__isnull=True
            ).order_by('-consent_timestamp').first()
            
            if not consent:
                return Response({
                    'status': 'error',
                    'message': 'No active consent found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Mark as withdrawn
            consent.withdrawn_at = timezone.now()
            consent.withdrawal_reason = request.data.get('reason', 'User requested withdrawal')
            consent.save()
            
            logger.info(f"Consent withdrawn by {request.user.email} - Consent ID: {consent.id}")
            
            return Response({
                'status': 'success',
                'message': 'Consent withdrawn successfully',
                'withdrawn_at': consent.withdrawn_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error withdrawing consent for {request.user.email}: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to withdraw consent'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def consent_audit_export(request):
    """
    Export consent data for audit purposes (Admin only)
    """
    try:
        # Get all consents or filter by date range
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        consents = CookieConsent.objects.all()
        
        if start_date:
            consents = consents.filter(consent_timestamp__gte=start_date)
        if end_date:
            consents = consents.filter(consent_timestamp__lte=end_date)
        
        # Limit results for performance
        consents = consents.order_by('-consent_timestamp')[:1000]
        
        # Serialize for audit
        audit_data = []
        for consent in consents:
            audit_data.append(consent.to_audit_dict())
        
        return Response({
            'status': 'success',
            'audit_data': audit_data,
            'total_records': len(audit_data),
            'exported_on': timezone.now().isoformat(),
            'exported_by': request.user.email
        })
        
    except Exception as e:
        logger.error(f"Error exporting consent audit data: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Failed to export audit data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def consent_stats(request):
    """
    Get consent statistics (anonymized)
    """
    try:
        total_consents = CookieConsent.objects.count()
        active_consents = CookieConsent.objects.filter(
            withdrawn_at__isnull=True,
            expiry_date__gt=timezone.now()
        ).count()
        
        analytics_granted = CookieConsent.objects.filter(
            analytics_cookies='granted',
            withdrawn_at__isnull=True,
            expiry_date__gt=timezone.now()
        ).count()
        
        marketing_granted = CookieConsent.objects.filter(
            marketing_cookies='granted',
            withdrawn_at__isnull=True,
            expiry_date__gt=timezone.now()
        ).count()
        
        return Response({
            'status': 'success',
            'stats': {
                'total_consents': total_consents,
                'active_consents': active_consents,
                'analytics_acceptance_rate': round((analytics_granted / active_consents * 100) if active_consents > 0 else 0, 1),
                'marketing_acceptance_rate': round((marketing_granted / active_consents * 100) if active_consents > 0 else 0, 1),
                'last_updated': timezone.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching consent stats: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Failed to fetch consent statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
