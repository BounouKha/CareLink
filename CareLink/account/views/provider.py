from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Case, When, IntegerField, Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
import logging
from rest_framework import viewsets, permissions

from CareLink.models import Provider, Contract, User, Service, ProviderAbsence, ProviderShortAbsence
from account.serializers.provider import (
    ProviderSerializer, 
    ProviderListSerializer, 
    ContractSerializer,
    ProviderStatsSerializer
)

logger = logging.getLogger(__name__)

def has_provider_management_permission(user):
    """Check if user has permission to manage providers"""
    if not user or not user.is_authenticated:
        return False
    
    allowed_roles = ['Administrative', 'Administrator', 'Coordinator']
    return user.role in allowed_roles

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_list(request):
    """
    Get list of all providers with basic information
    Only accessible by Administrative, Administrator, and Coordinator roles
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view providers'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        service_id = request.GET.get('service_id')
        contract_status = request.GET.get('contract_status')
        search = request.GET.get('search', '').strip()
        is_internal = request.GET.get('is_internal')        # Base queryset - get all providers with users (including those without contracts)
        # ALSO include users with contracts who might not have Provider records
        providers = Provider.objects.select_related('user', 'service').prefetch_related(
            'user__contract_set', 'user__phone_numbers'
        ).filter(user__isnull=False)  # Only get providers with valid users
        
        # Get users with contracts who might not be in Provider table
        users_with_contracts = User.objects.filter(
            contract__isnull=False
        ).exclude(
            id__in=Provider.objects.filter(user__isnull=False).values_list('user__id', flat=True)
        ).distinct()
        
        # For debugging - let's see what we have
        print(f"[DEBUG] Providers with users: {providers.count()}")
        print(f"[DEBUG] Users with contracts not in Provider table: {users_with_contracts.count()}")        # For debugging - let's also check specific user ID 24
        try:
            user_24 = User.objects.get(id=24)
            print(f"[DEBUG] User ID 24: {user_24.firstname} {user_24.lastname} ({user_24.email})")
            print(f"[DEBUG] User 24 role: {user_24.role}")
            print(f"[DEBUG] User 24 is_active: {user_24.is_active}")  # This determines Active/Inactive display
            print(f"[DEBUG] User 24 is_active type: {type(user_24.is_active)}")
            
            # Check if user 24 has Provider record
            try:
                provider_24 = Provider.objects.get(user=user_24)
                print(f"[DEBUG] User 24 has Provider record: ID {provider_24.id}")
            except Provider.DoesNotExist:
                print(f"[DEBUG] User 24 has NO Provider record")
            
            # Check contracts for user 24
            contracts_24 = user_24.contract_set.all()
            print(f"[DEBUG] User 24 contracts: {[f'ID{c.id}({c.status})' for c in contracts_24]}")
            for contract in contracts_24:
                print(f"[DEBUG]   Contract {contract.id}: status={contract.status}, active={contract.status == 'active'}")
                print(f"[DEBUG]   Contract {contract.id}: start_date={contract.start_date}, department={contract.department}")
            
        except User.DoesNotExist:
            print(f"[DEBUG] User ID 24 does not exist")
        
        if users_with_contracts.exists():
            print(f"[DEBUG] Users with contracts but no Provider record:")
            for user in users_with_contracts[:5]:  # Show first 5
                print(f"[DEBUG]   - User ID {user.id}: {user.firstname} {user.lastname} ({user.email})")
                contracts = user.contract_set.all()
                print(f"[DEBUG]     Contracts: {[f'ID{c.id}({c.status})' for c in contracts]}")
        
        # Apply filters
        if service_id:
            providers = providers.filter(service_id=service_id)
        
        if is_internal is not None:
            providers = providers.filter(is_internal=is_internal.lower() == 'true')
        
        if search:
            providers = providers.filter(
                Q(user__firstname__icontains=search) |
                Q(user__lastname__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Filter by contract status if specified
        if contract_status:
            if contract_status == 'no_contract':
                providers = providers.filter(user__contract_set__isnull=True)
            else:
                providers = providers.filter(user__contract_set__status=contract_status)
        
        # Order by user's full name (handle null users gracefully)
        providers = providers.order_by('user__firstname', 'user__lastname')
        
        serializer = ProviderListSerializer(providers, many=True)
        
        logger.info(f"Provider list accessed by {request.user.email} - {len(serializer.data)} providers returned")
        
        return Response({
            'providers': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in provider_list for user {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while fetching providers'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_detail(request, provider_id):
    """
    Get detailed information about a specific provider including contracts
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view provider details'
            }, status=status.HTTP_403_FORBIDDEN)
        
        provider = get_object_or_404(
            Provider.objects.select_related('user', 'service').prefetch_related(
                'user__contract_set__supervisor', 'user__phone_numbers'
            ),
            id=provider_id
        )
        
        serializer = ProviderSerializer(provider)
        
        logger.info(f"Provider {provider_id} details accessed by {request.user.email}")
        
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_detail for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while fetching provider details'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_contracts(request, provider_id):
    """
    Get all contracts for a specific provider
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view contracts'
            }, status=status.HTTP_403_FORBIDDEN)
        
        provider = get_object_or_404(Provider, id=provider_id)
        
        if not provider.user:
            return Response({
                'contracts': [],
                'count': 0
            }, status=status.HTTP_200_OK)
        
        contracts = provider.user.contract_set.select_related(
            'service', 'supervisor'
        ).order_by('-created_at')
        
        serializer = ContractSerializer(contracts, many=True)
        
        logger.info(f"Provider {provider_id} contracts accessed by {request.user.email}")
        
        return Response({
            'contracts': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_contracts for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while fetching contracts'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_stats(request):
    """
    Get provider statistics for dashboard
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view provider statistics'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Add debugging
        print(f"[DEBUG] Starting provider stats calculation...")
        
        # Calculate statistics with error handling
        try:
            total_providers = Provider.objects.count()
            print(f"[DEBUG] Total providers: {total_providers}")
        except Exception as e:
            print(f"[DEBUG] Error calculating total_providers: {e}")
            total_providers = 0
        try:
            # Providers with active contracts (only count those with users)
            # Use a proper join through Contract model instead of reverse relationship
            active_contracts = Provider.objects.filter(
                user__isnull=False
            ).filter(
                user__in=User.objects.filter(
                    contract__status='active'
                )
            ).distinct().count()
            print(f"[DEBUG] Active contracts: {active_contracts}")        
        except Exception as e:
            print(f"[DEBUG] Error calculating active_contracts: {e}")
            active_contracts = 0
        
        try:
            # Contracts expiring in next 30 days
            expiry_date = timezone.now().date() + timedelta(days=30)
            # Use proper join through Contract model instead of reverse relationship
            expiring_contracts = Provider.objects.filter(
                user__isnull=False
            ).filter(
                user__in=User.objects.filter(
                    contract__status='active',
                    contract__end_date__lte=expiry_date,
                    contract__end_date__gte=timezone.now().date()
                )
            ).distinct().count()
            print(f"[DEBUG] Expiring contracts: {expiring_contracts}")
        except Exception as e:
            print(f"[DEBUG] Error calculating expiring_contracts: {e}")
            expiring_contracts = 0
        try:
            # Providers without any contracts - use proper approach
            # Method 1: Providers without users
            providers_no_user = Provider.objects.filter(user__isnull=True).count()
            
            # Method 2: Providers with users but no contracts
            providers_with_users_no_contracts = Provider.objects.filter(
                user__isnull=False
            ).exclude(
                user__in=User.objects.filter(contract__isnull=False)
            ).count()
            
            # Total providers without contracts
            providers_without_contracts = providers_no_user + providers_with_users_no_contracts
            print(f"[DEBUG] Providers without contracts: {providers_without_contracts} (no user: {providers_no_user}, with user but no contracts: {providers_with_users_no_contracts})")
        except Exception as e:
            print(f"[DEBUG] Error calculating providers_without_contracts: {e}")
            providers_without_contracts = 0
        
        # Internal vs External providers
        internal_providers = Provider.objects.filter(is_internal=True).count()
        external_providers = Provider.objects.filter(is_internal=False).count()
        
        # Additional statistics that frontend expects
        try:
            # Providers with contracts (any contracts, not just active)
            providers_with_contracts = Provider.objects.filter(
                user__isnull=False,
                user__contract__isnull=False
            ).distinct().count()
            print(f"[DEBUG] Providers with contracts: {providers_with_contracts}")
        except Exception as e:
            print(f"[DEBUG] Error calculating providers_with_contracts: {e}")
            providers_with_contracts = 0
        
        # Contracts by type
        contract_types = Contract.objects.values('type_contract').annotate(
            count=Count('id')
        ).order_by('type_contract')
        contracts_by_type = {item['type_contract']: item['count'] for item in contract_types}
        
        # Contracts by status
        contract_statuses = Contract.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        contracts_by_status = {item['status']: item['count'] for item in contract_statuses}
        
        stats_data = {
            'total_providers': total_providers,
            'active_contracts': active_contracts,
            'expiring_contracts': expiring_contracts,
            'providers_without_contracts': providers_without_contracts,
            'internal_providers': internal_providers,
            'external_providers': external_providers,
            'providers_with_contracts': providers_with_contracts,
            'contracts_by_type': contracts_by_type,
            'contracts_by_status': contracts_by_status
        }
        
        serializer = ProviderStatsSerializer(stats_data)
        
        logger.info(f"Provider stats accessed by {request.user.email}")
        
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in provider_stats for user {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while calculating statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_users_for_provider(request):
    """
    Get list of users who can be assigned as providers
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view available users'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get users who are not already providers
        available_users = User.objects.filter(
            provider__isnull=True,
            is_active=True
        ).order_by('firstname', 'lastname')
        
        # Serialize basic user info
        users_data = []
        for user in available_users:
            users_data.append({
                'id': user.id,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'email': user.email,
                'full_name': f"{user.firstname} {user.lastname}".strip(),
                'role': user.role
            })
        
        logger.info(f"Available users for provider accessed by {request.user.email}")
        
        return Response({
            'users': users_data,
            'count': len(users_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in available_users_for_provider for user {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while fetching available users'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_contract(request, contract_id):
    """
    Activate a contract with business rule validation
    Only accessible by Administrative and Administrator roles
    """
    try:
        # Check user permissions (stricter for contract activation)
        if not (request.user.is_staff or request.user.is_superuser or 
                request.user.role in ['Administrative', 'Administrator']):
            return Response({
                'error': 'You do not have permission to activate contracts'
            }, status=status.HTTP_403_FORBIDDEN)
        
        contract = get_object_or_404(Contract, id=contract_id)
        
        # Check if contract can be activated
        can_activate, reason = contract.can_be_activated()
        
        if not can_activate:
            return Response({
                'error': f'Cannot activate contract: {reason}',
                'contract_id': contract_id,
                'current_status': contract.status
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Activate the contract
        contract.status = 'active'
        contract.save()  # This will trigger validation
        
        logger.info(f"Contract {contract_id} activated by {request.user.email}")
        
        # Return updated contract data
        serializer = ContractSerializer(contract)
        return Response({
            'message': 'Contract activated successfully',
            'contract': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Contract.DoesNotExist:
        return Response({
            'error': 'Contract not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({
            'error': 'Validation failed',
            'details': e.message_dict if hasattr(e, 'message_dict') else str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error activating contract {contract_id} by {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while activating the contract'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_contract(request, contract_id):
    """
    Terminate an active contract
    Only accessible by Administrative and Administrator roles
    """
    try:
        # Check user permissions
        if not (request.user.is_staff or request.user.is_superuser or 
                request.user.role in ['Administrative', 'Administrator']):
            return Response({
                'error': 'You do not have permission to terminate contracts'
            }, status=status.HTTP_403_FORBIDDEN)
        
        contract = get_object_or_404(Contract, id=contract_id)
        
        if contract.status != 'active':
            return Response({
                'error': f'Cannot terminate contract. Current status: {contract.status}',
                'contract_id': contract_id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get termination reason from request
        termination_reason = request.data.get('reason', '')
        
        # Terminate the contract
        contract.status = 'terminated'
        if termination_reason:
            current_notes = contract.notes or ''
            contract.notes = f"{current_notes}\n\nTerminated on {timezone.now().date()}: {termination_reason}".strip()
        
        contract.save()
        
        logger.info(f"Contract {contract_id} terminated by {request.user.email}")
        
        # Return updated contract data
        serializer = ContractSerializer(contract)
        return Response({
            'message': 'Contract terminated successfully',
            'contract': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Contract.DoesNotExist:
        return Response({
            'error': 'Contract not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error terminating contract {contract_id} by {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while terminating the contract'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_integrity_report(request):
    """
    Get data integrity report for providers and contracts
    Only accessible by Administrative and Administrator roles
    """
    try:
        # Check user permissions
        if not (request.user.is_staff or request.user.is_superuser or 
                request.user.role in ['Administrative', 'Administrator']):
            return Response({
                'error': 'You do not have permission to view data integrity reports'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Providers without contracts
        providers_no_user = Provider.objects.filter(user__isnull=True).count()
        providers_with_no_contracts = Provider.objects.filter(
            user__isnull=False
        ).exclude(
            user__in=User.objects.filter(contract__isnull=False)
        ).count()
        
        # Contracts without users
        contracts_without_users = Contract.objects.filter(user__isnull=True).count()
        
        # Inactive users with active contracts
        inactive_users_active_contracts = User.objects.filter(
            is_active=False,
            contract__status='active'
        ).distinct().count()
        
        # Expired active contracts
        today = timezone.now().date()
        expired_active_contracts = Contract.objects.filter(
            status='active',
            end_date__lt=today
        ).count()
        
        # Users with multiple active contracts
        from django.db.models import Count
        users_multiple_active = User.objects.annotate(
            active_contract_count=Count('contract', filter=Q(contract__status='active'))
        ).filter(active_contract_count__gt=1).count()
        
        integrity_report = {
            'providers_without_users': providers_no_user,
            'providers_without_contracts': providers_with_no_contracts,
            'contracts_without_users': contracts_without_users,
            'inactive_users_with_active_contracts': inactive_users_active_contracts,
            'expired_active_contracts': expired_active_contracts,
            'users_with_multiple_active_contracts': users_multiple_active,
            'total_issues': (
                providers_no_user + contracts_without_users + 
                inactive_users_active_contracts + expired_active_contracts + 
                users_multiple_active
            ),
            'generated_at': timezone.now().isoformat()
        }
        
        logger.info(f"Data integrity report accessed by {request.user.email}")
        
        return Response(integrity_report, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating integrity report for {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while generating the integrity report'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_contract_status(request, user_id):
    """
    Check if a specific user has valid contract(s) and return detailed status
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to check contract status'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get the user
        try:
            target_user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all contracts for this user
        contracts = target_user.contract_set.all().order_by('-created_at')
        
        # Check for active contracts
        active_contracts = contracts.filter(status='active')
        pending_contracts = contracts.filter(status='pending')
        expired_contracts = contracts.filter(status='inactive')
        
        # Check if user is a provider
        is_provider = hasattr(target_user, 'provider') and target_user.provider is not None
          # Contract validation results
        validation_results = {
            'user_id': user_id,
            'user_name': f"{target_user.firstname} {target_user.lastname}",
            'user_email': target_user.email,
            'user_active': target_user.is_active,
            'is_provider': is_provider,
            'has_valid_contract': False,
            'contract_status': 'no_contract',
            'total_contracts': contracts.count(),
            'active_contracts_count': active_contracts.count(),
            'pending_contracts_count': pending_contracts.count(),
            'expired_contracts_count': expired_contracts.count(),
            'weekly_hours': None,
            'weekly_hours_status': 'not_set',
            'workload_category': 'unknown',
            'workload_compliance': False,
            'can_work': False,
            'data_quality_score': 0,
            'current_contract': None,
            'issues': [],
            'recommendations': []
        }
        
        # Detailed contract analysis
        if active_contracts.exists():
            if active_contracts.count() == 1:
                # Single active contract - GOOD
                current_contract = active_contracts.first()
                validation_results.update({
                    'has_valid_contract': True,
                    'contract_status': 'active',
                    'current_contract': {                        'id': current_contract.id,
                        'reference': current_contract.contract_reference,
                        'type': current_contract.type_contract,
                        'start_date': current_contract.start_date,
                        'end_date': current_contract.end_date,
                        'weekly_hours': current_contract.weekly_hours,
                        'hourly_rate': str(current_contract.hourly_rate) if current_contract.hourly_rate else None
                    }
                })
                
                # Check if contract is expiring soon
                if hasattr(current_contract, 'days_until_expiry'):
                    days_left = current_contract.days_until_expiry()
                    if days_left is not None and days_left <= 30:
                        validation_results['issues'].append(f"Contract expires in {days_left} days")
                        validation_results['recommendations'].append("Consider renewing the contract soon")
                
            elif active_contracts.count() > 1:
                # Multiple active contracts - PROBLEM
                validation_results.update({
                    'has_valid_contract': False,
                    'contract_status': 'multiple_active',
                    'issues': [f"User has {active_contracts.count()} active contracts simultaneously"],
                    'recommendations': ["Deactivate all but one contract to resolve conflict"]
                })
                
        elif pending_contracts.exists():
            # Only pending contracts
            latest_pending = pending_contracts.first()
            validation_results.update({
                'has_valid_contract': False,
                'contract_status': 'pending_only',
                'current_contract': {
                    'id': latest_pending.id,
                    'reference': latest_pending.contract_reference,
                    'type': latest_pending.type_contract,
                    'status': latest_pending.status,
                    'start_date': latest_pending.start_date,
                    'end_date': latest_pending.end_date
                },
                'recommendations': ["Activate pending contract if requirements are met"]
            })
            
        elif expired_contracts.exists():
            # Only expired contracts
            validation_results.update({
                'contract_status': 'expired_only',
                'recommendations': ["Create new contract if user should continue working"]
            })
        
        # Additional checks
        if not target_user.is_active and active_contracts.exists():
            validation_results['issues'].append("User is inactive but has active contracts")
            validation_results['recommendations'].append("Deactivate contracts for inactive user")
        
        if target_user.role == 'Provider' and not is_provider:
            validation_results['issues'].append("User has 'Provider' role but no Provider profile")
            validation_results['recommendations'].append("Create Provider profile or update user role")
        
        if is_provider and not contracts.exists():
            validation_results['issues'].append("Provider has no contracts")
            validation_results['recommendations'].append("Create initial contract for this provider")
        
        logger.info(f"Contract status checked for user {user_id} by {request.user.email}")
        
        return Response(validation_results, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in check_user_contract_status for user {request.user.email}, target user {user_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while checking contract status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_current_user_contract_status(request):
    """
    Check contract status for the currently authenticated user
    """
    try:
        user = request.user
        
        # Get user's contracts
        contracts = user.contract_set.all().order_by('-created_at')
        active_contracts = contracts.filter(status='active')
        
        # Check if user is a provider
        is_provider = hasattr(user, 'provider') and user.provider is not None
        
        # Simple validation for current user
        result = {
            'user_id': user.id,
            'has_valid_contract': active_contracts.count() == 1,
            'is_provider': is_provider,
            'contract_status': 'no_contract',
            'can_work': False,
            'current_contract': None
        }
        
        if active_contracts.count() == 1:
            current_contract = active_contracts.first()
            result.update({
                'contract_status': 'active',
                'can_work': True,
                'current_contract': {
                    'id': current_contract.id,
                    'reference': current_contract.contract_reference,
                    'type': current_contract.type_contract,
                    'start_date': current_contract.start_date,
                    'end_date': current_contract.end_date
                }
            })
        elif active_contracts.count() > 1:
            result['contract_status'] = 'multiple_active'
        elif contracts.filter(status='pending').exists():
            result['contract_status'] = 'pending'
        elif contracts.exists():
            result['contract_status'] = 'expired'
        
        logger.info(f"Current user contract status checked by {request.user.email}")
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in check_current_user_contract_status for user {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while checking your contract status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_contract_status(request, user_id):
    """
    Check contract status and validity for a specific user
    Includes weekly hours verification and workload analysis
    """
    try:
        # Check user permissions
        if not has_provider_management_permission(request.user):
            return Response({
                'error': 'You do not have permission to view contract status'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(User, id=user_id)
        
        # Check if user is a provider
        try:
            provider = Provider.objects.get(user=user)
            is_provider = True
        except Provider.DoesNotExist:
            is_provider = False
            provider = None
        
        # Get contract information
        contracts = user.contract_set.all().order_by('-created_at')
        total_contracts = contracts.count()
        active_contracts = contracts.filter(status='active')
        pending_contracts = contracts.filter(status='pending')
        
        active_contracts_count = active_contracts.count()
        pending_contracts_count = pending_contracts.count()
        
        # Current contract analysis
        current_contract = None
        has_valid_contract = False
        contract_status = 'no_contract'
        
        if active_contracts.exists():
            contract = active_contracts.first()
            contract_status = 'active'
            has_valid_contract = True
            
            current_contract = {
                'id': contract.id,
                'reference': contract.contract_reference,
                'type': contract.type_contract,
                'status': contract.status,
                'start_date': contract.start_date,
                'end_date': contract.end_date,
                'weekly_hours': contract.weekly_hours,
                'hourly_rate': float(contract.hourly_rate) if contract.hourly_rate else None,
                'department': contract.department,
                'supervisor_name': f"{contract.supervisor.firstname} {contract.supervisor.lastname}" if contract.supervisor else None,
                'is_expired': contract.is_expired,
                'days_until_expiry': contract.days_until_expiry if contract.end_date else None
            }
        elif pending_contracts.exists():
            contract_status = 'pending'
            contract = pending_contracts.first()
            current_contract = {
                'id': contract.id,
                'reference': contract.contract_reference,
                'type': contract.type_contract,
                'status': contract.status,
                'start_date': contract.start_date,
                'end_date': contract.end_date,
                'weekly_hours': contract.weekly_hours,
                'hourly_rate': float(contract.hourly_rate) if contract.hourly_rate else None,
                'department': contract.department
            }
        elif total_contracts > 0:
            contract_status = 'inactive'
        
        # Weekly hours analysis
        weekly_hours = None
        weekly_hours_status = 'not_set'
        workload_category = 'unknown'
        workload_compliance = 'unknown'
        
        if current_contract:
            weekly_hours = current_contract.get('weekly_hours')
            if weekly_hours:
                weekly_hours_status = 'set'
                # Categorize workload
                if weekly_hours >= 35:
                    workload_category = 'full_time'
                    workload_compliance = 'standard' if weekly_hours <= 40 else 'overtime'
                elif weekly_hours >= 20:
                    workload_category = 'part_time'
                    workload_compliance = 'standard'
                elif weekly_hours >= 10:
                    workload_category = 'minimal'
                    workload_compliance = 'standard'
                else:
                    workload_category = 'very_low'
                    workload_compliance = 'needs_review'
            else:
                weekly_hours_status = 'not_set'
                workload_compliance = 'missing_data'
        
        # Issues detection
        issues = []
        if not user.is_active:
            issues.append("User account is inactive")
        if not is_provider:
            issues.append("User is not registered as a provider")
        if has_valid_contract and weekly_hours_status == 'not_set':
            issues.append("Active contract missing weekly hours specification")
        if weekly_hours and weekly_hours > 45:
            issues.append("Weekly hours exceed recommended maximum (45h)")
        if weekly_hours and weekly_hours < 5:
            issues.append("Weekly hours are unusually low")
        if active_contracts_count > 1:
            issues.append(f"User has {active_contracts_count} active contracts (should be 1)")
        
        # Generate recommendations
        recommendations = []
        if not is_provider:
            recommendations.append("Register user as a provider")
        elif not has_valid_contract:
            if pending_contracts_count > 0:
                recommendations.append("Activate pending contract to enable work authorization")
            else:
                recommendations.append("Create a new contract for this provider")
        elif current_contract and current_contract.get('end_date'):
            days_until_expiry = current_contract.get('days_until_expiry', 0)
            if days_until_expiry <= 30 and days_until_expiry > 0:
                recommendations.append(f"Contract expires in {days_until_expiry} days - consider renewal")
            elif days_until_expiry <= 0:
                recommendations.append("Contract has expired - create new contract or extend current one")
        
        # Weekly hours recommendations
        if has_valid_contract:
            if weekly_hours_status == 'not_set':
                recommendations.append("Set weekly hours in contract for proper workload management")
            elif weekly_hours and weekly_hours < 10:
                recommendations.append("Consider increasing weekly hours or verify if minimal workload is intended")
            elif weekly_hours and weekly_hours > 40:
                recommendations.append("Verify compliance with labor regulations for overtime hours")
        
        # Enhanced work authorization check
        can_work = (
            is_provider and 
            has_valid_contract and 
            user.is_active and
            contract_status == 'active' and
            weekly_hours_status == 'set' and
            weekly_hours and weekly_hours > 0 and
            workload_compliance in ['standard', 'overtime']  # Allow standard and overtime workloads
        )
        
        # Work authorization details
        work_auth_details = {
            'can_work': can_work,
            'reasons': []
        }
        
        if not can_work:
            if not is_provider:
                work_auth_details['reasons'].append('Not registered as provider')
            if not has_valid_contract:
                work_auth_details['reasons'].append('No valid contract')
            if not user.is_active:
                work_auth_details['reasons'].append('User account inactive')
            if contract_status != 'active':
                work_auth_details['reasons'].append(f'Contract status is {contract_status}')
            if weekly_hours_status != 'set':
                work_auth_details['reasons'].append('Weekly hours not specified')
            if weekly_hours and weekly_hours <= 0:
                work_auth_details['reasons'].append('Invalid weekly hours')
            if workload_compliance == 'needs_review':
                work_auth_details['reasons'].append('Workload needs review')
        
        response_data = {
            'user_id': user.id,
            'user_name': f"{user.firstname} {user.lastname}",
            'user_email': user.email,
            'user_active': user.is_active,
            'is_provider': is_provider,
            'provider_id': provider.id if provider else None,
            'has_valid_contract': has_valid_contract,
            'contract_status': contract_status,
            'total_contracts': total_contracts,
            'active_contracts_count': active_contracts_count,
            'pending_contracts_count': pending_contracts_count,
            'current_contract': current_contract,
            
            # Weekly hours analysis
            'weekly_hours': weekly_hours,
            'weekly_hours_status': weekly_hours_status,
            'workload_category': workload_category,
            'workload_compliance': workload_compliance,
            
            # Work authorization
            'work_authorization': work_auth_details,
            'can_work': can_work,
            
            # Issues and recommendations
            'issues': issues,
            'recommendations': recommendations,
            'data_quality_score': len([x for x in [user.is_active, is_provider, has_valid_contract, weekly_hours_status == 'set'] if x]) / 4 * 100
        }
        
        logger.info(f"Contract status for user {user_id} checked by {request.user.email}")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error checking contract status for user {user_id} by {request.user.email}: {str(e)}")
        return Response({
            'error': 'An error occurred while checking contract status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_contract_status(request):
    """
    Check contract status for the current authenticated user
    Includes weekly hours verification and workload analysis
    """
    return user_contract_status(request, request.user.id)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_schedule(request, provider_id):
    """
    Get weekly schedule data for a specific provider
    Shows all appointments (timeslots) for the provider
    """
    try:
        # Check user permissions - allow providers to view their own schedule
        if not (has_provider_management_permission(request.user) or 
                (request.user.role == 'Provider' and 
                 Provider.objects.filter(id=provider_id, user=request.user).exists())):
            return Response({
                'error': 'You do not have permission to view this schedule'
            }, status=status.HTTP_403_FORBIDDEN)
        
        provider = get_object_or_404(
            Provider.objects.select_related('user', 'service'),
            id=provider_id
        )
        
        # Get date range - default to current week, or from query params
        from datetime import datetime, timedelta
        import calendar as cal
        
        start_date_param = request.GET.get('start_date')
        if start_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            except ValueError:
                start_date = timezone.now().date()
        else:
            start_date = timezone.now().date()
        
        # Get start of week (Sunday - matching frontend ScheduleCalendar)
        # weekday() returns: Monday=0, Tuesday=1, ..., Sunday=6
        # We want to find the previous Sunday
        days_since_sunday = (start_date.weekday() + 1) % 7  # Convert to days since Sunday
        week_start = start_date - timedelta(days=days_since_sunday)
        week_end = week_start + timedelta(days=6)
        
        logger.info(f"Provider schedule calculation - start_date: {start_date}, weekday: {start_date.weekday()}, days_since_sunday: {days_since_sunday}, week_start: {week_start}, week_end: {week_end}")
          # Get all schedules for this provider in the week
        from CareLink.models import Schedule
        schedules = Schedule.objects.filter(
            provider=provider,
            date__range=[week_start, week_end]
        ).select_related('patient__user').prefetch_related('time_slots__service').order_by('date')
        
        # Build weekly schedule data
        schedule_data = {}
        total_weekly_hours = 0
        
        # Initialize empty week
        for i in range(7):
            day_date = week_start + timedelta(days=i)
            schedule_data[day_date.strftime('%Y-%m-%d')] = {
                'date': day_date.strftime('%Y-%m-%d'),
                'day_name': cal.day_name[day_date.weekday()],
                'appointments': []
            }
        
        # Fill in the appointments
        for schedule in schedules:
            date_key = schedule.date.strftime('%Y-%m-%d')
            
            for timeslot in schedule.time_slots.all():
                # Calculate duration in hours
                if timeslot.start_time and timeslot.end_time:
                    start_datetime = datetime.combine(schedule.date, timeslot.start_time)
                    end_datetime = datetime.combine(schedule.date, timeslot.end_time)
                    duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
                    total_weekly_hours += duration_hours
                else:
                    duration_hours = 0
                
                appointment_data = {
                    'id': timeslot.id,
                    'schedule_id': schedule.id,
                    'start_time': timeslot.start_time.strftime('%H:%M') if timeslot.start_time else None,
                    'end_time': timeslot.end_time.strftime('%H:%M') if timeslot.end_time else None,
                    'duration_hours': round(duration_hours, 2),
                    'status': getattr(timeslot, 'status', 'scheduled'),
                    'description': timeslot.description,
                    'patient': {
                        'id': schedule.patient.id if schedule.patient else None,
                        'name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else 'No Patient Assigned',
                        'email': schedule.patient.user.email if schedule.patient and schedule.patient.user else None
                    },
                    'service': {
                        'id': timeslot.service.id if timeslot.service else None,
                        'name': timeslot.service.name if timeslot.service else 'No Service',
                        'description': timeslot.service.description if timeslot.service else None
                    }
                }
                
                schedule_data[date_key]['appointments'].append(appointment_data)
        
        # Sort appointments by start time within each day
        for day_data in schedule_data.values():
            day_data['appointments'].sort(key=lambda x: x['start_time'] or '00:00')
        
        # Calculate statistics
        total_appointments = sum(len(day['appointments']) for day in schedule_data.values())
        completed_appointments = sum(
            len([apt for apt in day['appointments'] if apt['status'] == 'completed'])
            for day in schedule_data.values()
        )
        
        response_data = {
            'provider': {
                'id': provider.id,
                'name': f"{provider.user.firstname} {provider.user.lastname}" if provider.user else 'Unknown Provider',
                'email': provider.user.email if provider.user else None,
                'service': {
                    'id': provider.service.id if provider.service else None,
                    'name': provider.service.name if provider.service else 'General'
                }
            },
            'week_range': {
                'start_date': week_start.strftime('%Y-%m-%d'),
                'end_date': week_end.strftime('%Y-%m-%d'),
                'week_start_display': week_start.strftime('%B %d, %Y'),
                'week_end_display': week_end.strftime('%B %d, %Y')
            },
            'schedule_data': schedule_data,
            'statistics': {
                'total_weekly_hours': round(total_weekly_hours, 2),
                'total_appointments': total_appointments,
                'completed_appointments': completed_appointments,
                'completion_rate': round((completed_appointments / total_appointments * 100) if total_appointments > 0 else 0, 1)
            }
        }
        
        logger.info(f"Provider {provider_id} schedule accessed by {request.user.email} for week {week_start} to {week_end}")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_schedule for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while fetching provider schedule'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def provider_absences(request, provider_id):
    """
    GET: List provider absences
    POST: Create new provider absence
    Accessible by Administrative, Administrator, Coordinator, and the provider themselves
    """
    try:
        provider = get_object_or_404(Provider, id=provider_id)
        
        # Check permissions - admin/coordinator/administrative OR the provider themselves
        is_staff = has_provider_management_permission(request.user)
        is_own_provider = provider.user and provider.user.id == request.user.id
        
        if not (is_staff or is_own_provider):
            return Response({
                'error': 'You do not have permission to access this provider\'s absences'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            from CareLink.models import ProviderAbsence
            absences = ProviderAbsence.objects.filter(provider=provider).order_by('-start_date')
            
            absence_data = []
            for absence in absences:
                absence_data.append({
                    'id': absence.id,
                    'start_date': absence.start_date,
                    'end_date': absence.end_date,
                    'absence_type': absence.absence_type,
                    'status': absence.status,
                    'reason': absence.reason,
                    'created_by': f"{absence.created_by.firstname} {absence.created_by.lastname}".strip() if absence.created_by else None,
                    'created_at': absence.created_at,
                })
            
            return Response({
                'absences': absence_data,
                'total': len(absence_data)
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Only staff or the provider themselves can create absences
            if not (is_staff or is_own_provider):
                return Response({
                    'error': 'You do not have permission to create absences'
                }, status=status.HTTP_403_FORBIDDEN)
            
            from CareLink.models import ProviderAbsence
            
            data = request.data
            try:
                absence = ProviderAbsence.objects.create(
                    provider=provider,
                    start_date=data.get('start_date'),
                    end_date=data.get('end_date'),
                    absence_type=data.get('absence_type', 'vacation'),
                    status=data.get('status', 'scheduled'),
                    reason=data.get('reason', ''),
                    created_by=request.user
                )
                
                return Response({
                    'message': 'Absence created successfully',
                    'absence': {
                        'id': absence.id,
                        'start_date': absence.start_date,
                        'end_date': absence.end_date,
                        'absence_type': absence.absence_type,
                        'status': absence.status,
                        'reason': absence.reason,
                        'created_by': f"{absence.created_by.firstname} {absence.created_by.lastname}".strip() if absence.created_by else None,
                        'created_at': absence.created_at,
                    }
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Error creating absence: {str(e)}")
                return Response({
                    'error': 'Failed to create absence'
                }, status=status.HTTP_400_BAD_REQUEST)
        
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_absences for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while processing absences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_all_absences(request, provider_id):
    """
    Get all absences (full-day and short) for a provider
    """
    try:
        from CareLink.models import ProviderAbsence, ProviderShortAbsence
        provider = get_object_or_404(Provider, id=provider_id)
        # Permissions: admin/coordinator/administrative OR the provider themselves
        is_staff = has_provider_management_permission(request.user)
        is_own_provider = provider.user and provider.user.id == request.user.id
        if not (is_staff or is_own_provider):
            return Response({
                'error': 'You do not have permission to access this provider\'s absences'
            }, status=status.HTTP_403_FORBIDDEN)
        # Full-day absences
        absences = ProviderAbsence.objects.filter(provider=provider).order_by('-start_date')
        absence_data = []
        for absence in absences:
            absence_data.append({
                'id': absence.id,
                'type': 'full',
                'start_date': absence.start_date,
                'end_date': absence.end_date,
                'absence_type': absence.absence_type,
                'status': absence.status,
                'reason': absence.reason,
                'created_by': f"{absence.created_by.firstname} {absence.created_by.lastname}".strip() if absence.created_by else None,
                'created_at': absence.created_at,
            })
        # Short absences
        short_absences = ProviderShortAbsence.objects.filter(provider=provider).order_by('-date', 'start_time')
        short_absence_data = []
        for sab in short_absences:
            short_absence_data.append({
                'id': sab.id,
                'type': 'short',
                'date': sab.date,
                'start_time': sab.start_time,
                'end_time': sab.end_time,
                'absence_type': sab.absence_type,
                'reason': sab.reason,
                'created_by': f"{sab.created_by.firstname} {sab.created_by.lastname}".strip() if sab.created_by else None,
                'created_at': sab.created_at,
            })
        return Response({
            'full_absences': absence_data,
            'short_absences': short_absence_data,
            'total': len(absence_data) + len(short_absence_data)
        }, status=status.HTTP_200_OK)
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_all_absences for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while processing absences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_absence_check(request, provider_id):
    """
    Check if a provider is absent on specific dates
    Query params: dates (comma-separated list of dates in YYYY-MM-DD format)
    Returns: Dictionary with dates as keys and absence info as values
    """
    try:
        provider = get_object_or_404(Provider, id=provider_id)
        
        # Check permissions - admin/coordinator/administrative OR the provider themselves
        is_staff = has_provider_management_permission(request.user)
        is_own_provider = provider.user and provider.user.id == request.user.id
        
        if not (is_staff or is_own_provider):
            return Response({
                'error': 'You do not have permission to check this provider\'s absences'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get dates from query params
        dates_param = request.GET.get('dates', '')
        if not dates_param:
            return Response({
                'error': 'dates parameter is required (comma-separated list of YYYY-MM-DD dates)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse dates
        try:
            from datetime import datetime
            dates = [datetime.strptime(date.strip(), '%Y-%m-%d').date() for date in dates_param.split(',')]
        except ValueError as e:
            return Response({
                'error': f'Invalid date format: {str(e)}. Use YYYY-MM-DD format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from CareLink.models import ProviderAbsence, ProviderShortAbsence
        
        # Check full-day absences
        full_absences = ProviderAbsence.objects.filter(
            provider=provider,
            start_date__lte=max(dates),
            end_date__gte=min(dates)
        )
        
        # Check short absences
        short_absences = ProviderShortAbsence.objects.filter(
            provider=provider,
            date__in=dates
        )
        
        # Build response
        absence_data = {}
        
        for date in dates:
            date_str = date.strftime('%Y-%m-%d')
            absence_data[date_str] = {
                'is_absent': False,
                'absence_type': None,
                'absence_reason': None,
                'full_day_absence': None,
                'short_absences': []
            }
            
            # Check for full-day absences
            for absence in full_absences:
                if absence.start_date <= date <= absence.end_date:
                    absence_data[date_str]['is_absent'] = True
                    absence_data[date_str]['absence_type'] = absence.absence_type
                    absence_data[date_str]['absence_reason'] = absence.reason
                    absence_data[date_str]['full_day_absence'] = {
                        'id': absence.id,
                        'start_date': absence.start_date,
                        'end_date': absence.end_date,
                        'status': absence.status
                    }
                    break  # Only one full-day absence per date
            
            # Check for short absences (only if no full-day absence)
            if not absence_data[date_str]['is_absent']:
                for short_absence in short_absences:
                    if short_absence.date == date:
                        absence_data[date_str]['short_absences'].append({
                            'id': short_absence.id,
                            'start_time': short_absence.start_time,
                            'end_time': short_absence.end_time,
                            'absence_type': short_absence.absence_type,
                            'reason': short_absence.reason
                        })
                
                # If there are short absences, mark as partially absent
                if absence_data[date_str]['short_absences']:
                    absence_data[date_str]['is_absent'] = True
                    absence_data[date_str]['absence_type'] = 'partial'
        
        logger.info(f"Provider {provider_id} absence check accessed by {request.user.email} for dates: {dates}")
        
        return Response({
            'provider_id': provider_id,
            'provider_name': f"{provider.user.firstname} {provider.user.lastname}" if provider.user else 'Unknown',
            'absence_data': absence_data
        }, status=status.HTTP_200_OK)
        
    except Provider.DoesNotExist:
        return Response({
            'error': 'Provider not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in provider_absence_check for user {request.user.email}, provider {provider_id}: {str(e)}")
        return Response({
            'error': 'An error occurred while checking absences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        """Override update to add debugging"""
        try:
            print(f"[ContractViewSet] Update request data: {request.data}")
            print(f"[ContractViewSet] Contract ID: {kwargs.get('pk')}")
            
            # Get the contract instance
            instance = self.get_object()
            print(f"[ContractViewSet] Current contract data: user={instance.user}, service={instance.service}, status={instance.status}")
            
            # Try to update
            response = super().update(request, *args, **kwargs)
            print(f"[ContractViewSet] Update successful: {response.data}")
            return response
            
        except Exception as e:
            print(f"[ContractViewSet] Update error: {str(e)}")
            print(f"[ContractViewSet] Error type: {type(e)}")
            import traceback
            print(f"[ContractViewSet] Traceback: {traceback.format_exc()}")
            raise
