from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.http import Http404
from django.core.paginator import Paginator
from django.contrib.auth import get_user_model
from django.db.models import Q
from CareLink.models import CookieConsent
from account.serializers.consent import ConsentStorageSerializer, ConsentAuditSerializer, CookieConsentSerializer
import logging

logger = logging.getLogger('carelink')

User = get_user_model()

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

class AdminConsentListView(APIView):
    """
    Admin endpoint to list all consents with pagination and filtering
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """List consents with pagination and filtering"""
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 20)), 100)  # Max 100 items per page
            status_filter = request.GET.get('status', 'all')
            type_filter = request.GET.get('type', 'all')
            search = request.GET.get('search', '').strip()
            since_date = request.GET.get('since_date')
            
            # Start with all consents
            consents = CookieConsent.objects.all()
            
            # Apply filters
            if status_filter != 'all':
                if status_filter == 'granted':
                    consents = consents.filter(withdrawn_at__isnull=True, expiry_date__gt=timezone.now())
                elif status_filter == 'withdrawn':
                    consents = consents.filter(withdrawn_at__isnull=False)
                elif status_filter == 'pending':
                    consents = consents.filter(withdrawn_at__isnull=True, expiry_date__lte=timezone.now())
            
            if type_filter != 'all':
                if type_filter == 'essential':
                    consents = consents.filter(essential_cookies='granted')
                elif type_filter == 'analytics':
                    consents = consents.filter(analytics_cookies='granted')                
                elif type_filter == 'marketing':
                    consents = consents.filter(marketing_cookies='granted')
                elif type_filter == 'functional':
                    consents = consents.filter(functional_cookies='granted')
            
            if since_date:
                try:
                    since_date_parsed = timezone.datetime.fromisoformat(since_date.replace('Z', '+00:00'))
                    consents = consents.filter(consent_timestamp__gte=since_date_parsed)
                except ValueError:
                    pass
            
            if search:
                # Search by user email or user identifier
                consents = consents.filter(
                    Q(user__email__icontains=search) |
                    Q(user_identifier__icontains=search)
                )
              # Order by newest first and select related user
            consents = consents.select_related('user').order_by('-consent_timestamp')
            
            # Paginate
            paginator = Paginator(consents, page_size)
            page_obj = paginator.get_page(page)            # Serialize consent data
            consent_data = []
            for consent in page_obj:
                # Safely get user info, handling cases where user might have been deleted
                try:
                    if consent.user_id and consent.user:
                        user_email = consent.user.email
                        user_id = consent.user.id
                    else:
                        user_email = 'Anonymous'
                        user_id = None
                except (User.DoesNotExist, AttributeError):
                    user_email = 'Deleted User'
                    user_id = consent.user_id if hasattr(consent, 'user_id') else None
                  # Determine current status
                current_status = 'granted'
                if consent.withdrawn_at:
                    current_status = 'withdrawn'
                elif consent.expiry_date <= timezone.now():
                    current_status = 'expired'
                
                # Calculate days until expiry
                days_until_expiry = (consent.expiry_date - timezone.now()).days if consent.expiry_date > timezone.now() else 0
                
                consent_data.append({
                    'id': consent.id,
                    'user_id': user_id,
                    'user_email': user_email,
                    'session_id': consent.user_identifier,  # Use user_identifier as session_id
                    'consent_timestamp': consent.consent_timestamp.isoformat(),
                    'status': current_status,
                    'essential_cookies': consent.essential_cookies,
                    'analytics_cookies': consent.analytics_cookies,
                    'marketing_cookies': consent.marketing_cookies,
                    'functional_cookies': consent.functional_cookies,
                    'expiry_date': consent.expiry_date.isoformat(),
                    'withdrawn_at': consent.withdrawn_at.isoformat() if consent.withdrawn_at else None,
                    'withdrawal_reason': consent.withdrawal_reason,
                    'days_until_expiry': days_until_expiry,
                    'ip_address': getattr(consent, 'ip_address', 'N/A'),  # Default if field doesn't exist
                    'user_agent': (consent.user_agent_snippet[:100] + '...' if len(consent.user_agent_snippet) > 100 else consent.user_agent_snippet) if consent.user_agent_snippet else 'N/A'
                })
              # Get stats for the header
            total_consents = CookieConsent.objects.count()
            total_users = User.objects.count()
            granted_consents = CookieConsent.objects.filter(
                withdrawn_at__isnull=True,
                expiry_date__gt=timezone.now()
            ).count()
            withdrawn_consents = CookieConsent.objects.filter(
                withdrawn_at__isnull=False
            ).count()
            
            # Debug logging
            logger.info(f"[ConsentAdmin] Found {total_consents} total consents, {len(consent_data)} on this page")
            logger.info(f"[ConsentAdmin] User requesting: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
            compliance_rate = round((granted_consents / total_consents * 100) if total_consents > 0 else 0, 1)
            
            return Response({
                'status': 'success',
                'consents': consent_data,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_items': paginator.count,
                    'page_size': page_size,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous()
                },
                'stats': {
                    'total_consents': total_consents,
                    'total_users': total_users,
                    'granted_consents': granted_consents,
                    'withdrawn_consents': withdrawn_consents,
                    'compliance_rate': compliance_rate
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching consent list: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to fetch consent data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
