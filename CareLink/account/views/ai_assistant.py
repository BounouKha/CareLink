from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import (
    User, FamilyPatient, ServiceDemand, MedicalFolder, 
    Provider, Contract, Invoice, EnhancedTicket, Notification
)
from account.serializers.user import UserSerializer
from account.serializers.familypatient import FamilyPatientSerializer
from account.serializers.servicedemand import ServiceDemandSerializer
from account.serializers.provider import ProviderSerializer
from account.serializers.invoice import InvoiceSerializer
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from datetime import datetime, timedelta
from django.utils import timezone
from CareLink.models import Schedule, TimeSlot, User, Patient, FamilyPatient, ServiceDemand, Provider, Invoice, EnhancedTicket, Contract
import json


class AIStatsAPIView(APIView):
    """API for AI to get general statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get current date
            today = timezone.now().date()
            
            # Patient statistics
            total_patients = FamilyPatient.objects.count()
            # FamilyPatient doesn't have is_active field, so we count all as active
            active_patients = total_patients
            
            # Service demand statistics
            total_demands = ServiceDemand.objects.count()
            pending_demands = ServiceDemand.objects.filter(status='Pending').count()
            in_progress_demands = ServiceDemand.objects.filter(status='In Progress').count()
            completed_demands = ServiceDemand.objects.filter(status='Completed').count()
            
            # Today's statistics
            today_demands = ServiceDemand.objects.filter(
                created_at__date=today
            ).count()
            
            overdue_demands = ServiceDemand.objects.filter(
                status__in=['Pending', 'In Progress'],
                created_at__lt=today - timedelta(days=7)
            ).count()
            
            # Provider statistics
            total_providers = Provider.objects.count()
            # Provider doesn't have is_active field, so we count all as active
            active_providers = total_providers
            
            # Invoice statistics
            total_invoices = Invoice.objects.count()
            unpaid_invoices = Invoice.objects.filter(status='In Progress').count()
            
            # Ticket statistics
            total_tickets = EnhancedTicket.objects.count()
            open_tickets = EnhancedTicket.objects.filter(status='New').count()
            
            stats = {
                'patients': {
                    'total': total_patients,
                    'active': active_patients
                },
                'service_demands': {
                    'total': total_demands,
                    'pending': pending_demands,
                    'in_progress': in_progress_demands,
                    'completed': completed_demands,
                    'today': today_demands,
                    'overdue': overdue_demands
                },
                'providers': {
                    'total': total_providers,
                    'active': active_providers
                },
                'invoices': {
                    'total': total_invoices,
                    'unpaid': unpaid_invoices
                },
                'tickets': {
                    'total': total_tickets,
                    'open': open_tickets
                },
                'date': today.isoformat()
            }
            
            return Response({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIPendingTasksAPIView(APIView):
    """API for AI to get pending tasks and overdue items"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            today = timezone.now().date()
            
            # Overdue service demands (older than 7 days)
            overdue_demands = ServiceDemand.objects.filter(
                status__in=['Pending', 'In Progress'],
                created_at__lt=today - timedelta(days=7)
            ).select_related('patient', 'service')[:10]
            
            # Recent pending demands
            recent_pending = ServiceDemand.objects.filter(
                status='Pending'
            ).select_related('patient', 'service').order_by('-created_at')[:10]
            
            # Unpaid invoices
            unpaid_invoices = Invoice.objects.filter(
                status='In Progress'
            ).select_related('patient').order_by('-created_at')[:10]
            
            # Open tickets
            open_tickets = EnhancedTicket.objects.filter(
                status='New'
            ).order_by('-created_at')[:10]
            
            pending_tasks = {
                'overdue_demands': ServiceDemandSerializer(overdue_demands, many=True).data,
                'recent_pending': ServiceDemandSerializer(recent_pending, many=True).data,
                'unpaid_invoices': InvoiceSerializer(unpaid_invoices, many=True).data,
                'open_tickets': [
                    {
                        'id': ticket.id,
                        'title': ticket.title,
                        'status': ticket.status,
                        'priority': ticket.priority,
                        'created_at': ticket.created_at.isoformat()
                    }
                    for ticket in open_tickets
                ]
            }
            
            return Response({
                'success': True,
                'data': pending_tasks
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIPatientSearchAPIView(APIView):
    """API for AI to search patient information with verification capabilities"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            query = request.GET.get('q', '')
            limit = int(request.GET.get('limit', 10))
            email = request.GET.get('email', '')
            national_number = request.GET.get('national_number', '')
            birthdate = request.GET.get('birthdate', '')
            
            # If unique identifiers are provided, search by them first
            if email or national_number or birthdate:
                print(f"🔍 Searching by unique identifiers: email={email}, national_number={national_number}, birthdate={birthdate}")
                
                # Search only in Patient records (not FamilyPatient)
                from CareLink.models import Patient
                patients = Patient.objects.all()
                
                if email:
                    print(f"📧 Filtering by email: {email}")
                    # Search only by patient email
                    patients = patients.filter(user__email__iexact=email)
                    print(f"📧 Patients found with email: {patients.count()}")
                if national_number:
                    patients = patients.filter(user__national_number__iexact=national_number)
                if birthdate:
                    patients = patients.filter(user__birthdate=birthdate)
                
                # If we have unique identifiers, we should get exact matches
                if patients.count() == 1:
                    patient = patients.first()
                    print(f"✅ Found single patient: {patient}")
                    return self._get_detailed_patient_info_from_patient(patient, is_verified=True)
                elif patients.count() > 1:
                    # Multiple patients with same email - this is a real data inconsistency
                    print(f"⚠️ Multiple patients with same email - data inconsistency")
                    
                    # Return list of patients with same email for user to choose
                    patient_list = []
                    for patient in patients:
                        user = patient.user if patient.user else None
                        
                        patient_info = {
                            'id': patient.id,
                            'first_name': user.firstname if user else 'Unknown',
                            'last_name': user.lastname if user else 'Unknown',
                            'email': user.email if user else None,
                            'birthdate': user.birthdate.isoformat() if user and user.birthdate else None,
                            'national_number': user.national_number if user else None,
                            'needs_verification': True,
                            'data_inconsistency': True
                        }
                        patient_list.append(patient_info)
                    
                    return Response({
                        'success': True,
                        'multiple_matches': True,
                        'data_inconsistency': True,
                        'message': f'Found {len(patient_list)} different patients with the same email address. This indicates a data inconsistency. Please provide additional unique identifier (national number or birthdate) to identify the correct patient.',
                        'patients': patient_list
                    })
                else:
                    print(f"❌ No patients found with unique identifiers")
                    return Response({
                        'success': False,
                        'error': 'No patient found with the provided unique identifiers'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # If no unique identifiers, search by name
            if not query:
                return Response({
                    'success': False,
                    'error': 'Query parameter "q" is required when no unique identifiers provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Search patients by name
            patients = Patient.objects.filter(
                Q(user__firstname__icontains=query) |
                Q(user__lastname__icontains=query) |
                Q(id__icontains=query)
            )[:limit]
            
            if patients.count() == 1:
                # Single match - return detailed info
                return self._get_detailed_patient_info_from_patient(patients.first(), is_verified=True)
            elif patients.count() > 1:
                # Multiple matches - return list for verification
                patient_list = []
                for patient in patients:
                    user = patient.user if patient.user else None
                    patient_info = {
                        'id': patient.id,
                        'first_name': user.firstname if user else 'Unknown',
                        'last_name': user.lastname if user else 'Unknown',
                        'email': user.email if user else None,
                        'birthdate': user.birthdate.isoformat() if user and user.birthdate else None,
                        'national_number': user.national_number if user else None,
                        'needs_verification': True
                    }
                    patient_list.append(patient_info)
                
                return Response({
                    'success': True,
                    'multiple_matches': True,
                    'message': f'Found {len(patient_list)} patients with similar names. Please provide unique identifier (email, national number, or birthdate) to verify the correct patient.',
                    'patients': patient_list
                })
            else:
                return Response({
                    'success': False,
                    'error': 'No patients found with the provided search criteria'
                }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_detailed_patient_info_from_patient(self, patient, is_verified=False):
        """Get detailed patient information including service demands from Patient object"""
        try:
            print(f"🔍 Getting detailed info for patient: {patient}")
            user = patient.user if patient.user else None
            print(f"👤 User found: {user}")
            
            # Get patient's recent service demands
            recent_demands = ServiceDemand.objects.filter(
                patient=patient
            ).order_by('-created_at')[:5]
            print(f"📋 Recent demands found: {recent_demands.count()}")
            
            # Get patient's medical folder
            medical_folder = MedicalFolder.objects.filter(
                patient=patient
            ).first()
            print(f"📁 Medical folder found: {medical_folder is not None}")
            
            patient_info = {
                'id': patient.id,
                'first_name': user.firstname if user else 'Unknown',
                'last_name': user.lastname if user else 'Unknown',
                'email': user.email if user else None,
                'birthdate': user.birthdate.isoformat() if user and user.birthdate else None,
                'national_number': user.national_number if user else None,
                'address': user.address if user else None,
                'is_verified': is_verified,
                'recent_service_demands': ServiceDemandSerializer(recent_demands, many=True).data,
                'medical_folder_exists': medical_folder is not None,
                'total_service_demands': ServiceDemand.objects.filter(patient=patient).count(),
                'active_service_demands': ServiceDemand.objects.filter(
                    patient=patient, 
                    status__in=['Pending', 'In Progress']
                ).count()
            }
            
            print(f"✅ Patient info prepared successfully")
            return Response({
                'success': True,
                'data': patient_info
            })
            
        except Exception as e:
            print(f"❌ Error in _get_detailed_patient_info_from_patient: {str(e)}")
            return Response({
                'success': False,
                'error': f'Error getting detailed patient info: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_detailed_patient_info(self, patient, is_verified=False):
        """Get detailed patient information including service demands from FamilyPatient object"""
        try:
            print(f"🔍 Getting detailed info for family patient: {patient}")
            user = patient.patient.user if patient.patient else None
            print(f"👤 User found: {user}")
            
            # Get patient's recent service demands
            recent_demands = ServiceDemand.objects.filter(
                patient=patient.patient
            ).order_by('-created_at')[:5]
            print(f"📋 Recent demands found: {recent_demands.count()}")
            
            # Get patient's medical folder
            medical_folder = MedicalFolder.objects.filter(
                patient=patient.patient
            ).first()
            print(f"📁 Medical folder found: {medical_folder is not None}")
            
            patient_info = {
                'id': patient.patient.id if patient.patient else patient.id,
                'first_name': user.firstname if user else 'Unknown',
                'last_name': user.lastname if user else 'Unknown',
                'email': user.email if user else None,
                'birthdate': user.birthdate.isoformat() if user and user.birthdate else None,
                'national_number': user.national_number if user else None,
                'address': user.address if user else None,
                'is_verified': is_verified,
                'recent_service_demands': ServiceDemandSerializer(recent_demands, many=True).data,
                'medical_folder_exists': medical_folder is not None,
                'total_service_demands': ServiceDemand.objects.filter(patient=patient.patient).count(),
                'active_service_demands': ServiceDemand.objects.filter(
                    patient=patient.patient, 
                    status__in=['Pending', 'In Progress']
                ).count()
            }
            
            print(f"✅ Patient info prepared successfully")
            return Response({
                'success': True,
                'data': patient_info
            })
            
        except Exception as e:
            print(f"❌ Error in _get_detailed_patient_info: {str(e)}")
            return Response({
                'success': False,
                'error': f'Error getting detailed patient info: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIServiceDemandStatusAPIView(APIView):
    """API for AI to check specific service demand status"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, demand_id):
        try:
            demand = ServiceDemand.objects.select_related(
                'patient', 'service'
            ).get(id=demand_id)
            
            demand_data = ServiceDemandSerializer(demand).data
            
            # Add additional context
            demand_data['days_since_creation'] = (
                timezone.now().date() - demand.created_at.date()
            ).days
            
            demand_data['is_overdue'] = (
                demand.status in ['Pending', 'In Progress'] and
                demand_data['days_since_creation'] > 7
            )
            
            return Response({
                'success': True,
                'data': demand_data
            })
            
        except ServiceDemand.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Service demand not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIProviderScheduleAPIView(APIView):
    """API for AI to get provider schedules and availability"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get all providers (no is_active field in Provider model)
            providers = Provider.objects.all()
            
            provider_schedules = []
            for provider in providers:
                # Get provider's contracts
                contracts = Contract.objects.filter(user=provider.user, status='active')
                
                # Get recent absences
                recent_absences = provider.absences.filter(
                    start_date__gte=timezone.now().date()
                ).order_by('start_date')[:5]
                
                provider_info = {
                    'id': provider.id,
                    'name': f"{provider.user.first_name} {provider.user.last_name}",
                    'is_active': True,  # Provider model doesn't have is_active field
                    'contracts_count': contracts.count(),
                    'recent_absences': [
                        {
                            'start_date': absence.start_date.isoformat(),
                            'end_date': absence.end_date.isoformat(),
                            'reason': absence.reason
                        }
                        for absence in recent_absences
                    ]
                }
                provider_schedules.append(provider_info)
            
            return Response({
                'success': True,
                'data': provider_schedules
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIWeeklyReportAPIView(APIView):
    """API for AI to get weekly statistics and reports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Calculate date range for this week
            today = timezone.now().date()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            
            # Weekly service demands
            weekly_demands = ServiceDemand.objects.filter(
                created_at__date__range=[start_of_week, end_of_week]
            )
            
            # Weekly statistics
            weekly_stats = {
                'period': {
                    'start': start_of_week.isoformat(),
                    'end': end_of_week.isoformat()
                },
                'service_demands': {
                    'total': weekly_demands.count(),
                    'pending': weekly_demands.filter(status='Pending').count(),
                    'in_progress': weekly_demands.filter(status='In Progress').count(),
                    'completed': weekly_demands.filter(status='Completed').count()
                },
                'new_patients': FamilyPatient.objects.filter(
                    patient__user__created_at__date__range=[start_of_week, end_of_week]
                ).count(),
                'new_invoices': Invoice.objects.filter(
                    created_at__date__range=[start_of_week, end_of_week]
                ).count(),
                'new_tickets': EnhancedTicket.objects.filter(
                    created_at__date__range=[start_of_week, end_of_week]
                ).count()
            }
            
            return Response({
                'success': True,
                'data': weekly_stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 


class AIWeeklyAppointmentsAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Calculate next week's date range
            today = timezone.now().date()
            start_of_week = today + timedelta(days=(7 - today.weekday()))
            end_of_week = start_of_week + timedelta(days=6)
            
            print(f"📅 Fetching appointments from {start_of_week} to {end_of_week}")
            
            # Get all appointments for next week
            appointments = Schedule.objects.filter(
                date__range=[start_of_week, end_of_week],
                status='confirmed'  # Only confirmed appointments
            ).select_related('patient', 'patient__user', 'provider', 'provider__user')
            
            # Group by patient
            appointments_by_patient = {}
            
            for appointment in appointments:
                patient_name = f"{appointment.patient.user.firstname} {appointment.patient.user.lastname}"
                
                if patient_name not in appointments_by_patient:
                    appointments_by_patient[patient_name] = {
                        'patient_name': patient_name,
                        'patient_email': appointment.patient.user.email,
                        'appointments': []
                    }
                
                appointments_by_patient[patient_name]['appointments'].append({
                    'date': appointment.date.strftime('%Y-%m-%d'),
                    'day': appointment.date.strftime('%A'),
                    'time': appointment.start_time.strftime('%H:%M'),
                    'provider': f"{appointment.provider.user.firstname} {appointment.provider.user.lastname}",
                    'service': appointment.service_type if hasattr(appointment, 'service_type') else 'Consultation',
                    'status': appointment.status
                })
            
            # Sort patients alphabetically
            sorted_patients = dict(sorted(appointments_by_patient.items()))
            
            result = {
                'success': True,
                'week_range': {
                    'start': start_of_week.strftime('%Y-%m-%d'),
                    'end': end_of_week.strftime('%Y-%m-%d')
                },
                'total_appointments': sum(len(patient['appointments']) for patient in sorted_patients.values()),
                'patients': list(sorted_patients.values())
            }
            
            print(f"📅 Found {result['total_appointments']} appointments for {len(sorted_patients)} patients")
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ Error in AIWeeklyAppointmentsAPIView: {e}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500) 