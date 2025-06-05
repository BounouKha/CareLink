from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta, date
from django.db.models import Q, Count, Avg
from CareLink.models import Schedule, TimeSlot, Provider, Patient, Service, ServiceDemand
from account.serializers.user import UserSerializer
import calendar

class ScheduleCalendarView(APIView):
    """
    Main calendar view for coordinators to see schedules, appointments, and availability
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get calendar data for a specific date range"""
        # Only coordinators and admin can access schedule management
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
          # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        view_type = request.query_params.get('view', 'week')  # day, week, month
        provider_id = request.query_params.get('provider_id')
        status = request.query_params.get('status')
        
        try:
            # Parse dates or use defaults
            if start_date:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            else:
                start_date = date.today()
                
            if end_date:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            else:
                # Set end date based on view type
                if view_type == 'day':
                    end_date = start_date
                elif view_type == 'week':
                    end_date = start_date + timedelta(days=6)
                elif view_type == 'month':
                    # Get last day of the month
                    last_day = calendar.monthrange(start_date.year, start_date.month)[1]
                    end_date = start_date.replace(day=last_day)
                else:
                    end_date = start_date + timedelta(days=6)
              # Get schedules within date range
            schedules_query = Schedule.objects.filter(
                date__range=[start_date, end_date]
            ).select_related('patient__user', 'provider__user', 'created_by')
            
            # Filter by provider if specified
            if provider_id:
                schedules_query = schedules_query.filter(provider_id=provider_id)
            schedules = schedules_query.all()
            
            # Build calendar data structure
            calendar_data = []
            
            for schedule in schedules:                # Get timeslots for this schedule using the correct ManyToMany relationship
                schedule_timeslots = schedule.time_slots.all()
                
                schedule_data = {
                    'id': schedule.id,
                    'date': schedule.date,
                    'provider': {
                        'id': schedule.provider.id if schedule.provider else None,
                        'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Unassigned',
                        'email': schedule.provider.user.email if schedule.provider and schedule.provider.user else None
                    },
                    'patient': {
                        'id': schedule.patient.id if schedule.patient else None,
                        'name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else 'No Patient',
                        'email': schedule.patient.user.email if schedule.patient and schedule.patient.user else None
                    },
                    'created_by': {
                        'id': schedule.created_by.id if schedule.created_by else None,
                        'name': f"{schedule.created_by.firstname} {schedule.created_by.lastname}" if schedule.created_by else 'Unknown',
                        'email': schedule.created_by.email if schedule.created_by else None
                    } if hasattr(schedule, 'created_by') and schedule.created_by else None,
                    'timeslots': []
                }
                # Apply status filter if specified
                if status:
                    schedule_timeslots = schedule_timeslots.filter(status=status)
                
                for timeslot in schedule_timeslots:
                    timeslot_data = {
                        'id': timeslot.id,
                        'start_time': timeslot.start_time,
                        'end_time': timeslot.end_time,
                        'description': timeslot.description,                        'service': {
                            'id': timeslot.service.id if timeslot.service else None,
                            'name': timeslot.service.name if timeslot.service else 'No Service',
                            'price': float(timeslot.service.price) if timeslot.service else 0
                        },
                        'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled',
                        'notes': timeslot.description or ''
                    }
                    schedule_data['timeslots'].append(timeslot_data)
                
                calendar_data.append(schedule_data)
            
            # Get summary statistics
            stats = self.get_calendar_stats(start_date, end_date, provider_id)
            
            # Get available providers
            providers = Provider.objects.select_related('user', 'service').all()
            providers_data = []
            for provider in providers:
                if provider.user:
                    providers_data.append({
                        'id': provider.id,
                        'name': f"{provider.user.firstname} {provider.user.lastname}",
                        'email': provider.user.email,
                        'service': provider.service.name if provider.service else 'General',
                        'is_internal': provider.is_internal
                    })
            
            return Response({
                'calendar_data': calendar_data,
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'view_type': view_type
                },
                'stats': stats,
                'providers': providers_data
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to fetch calendar data: {str(e)}'
            }, status=500)
    
    def get_calendar_stats(self, start_date, end_date, provider_id=None):
        """Get statistics for the calendar period"""
        try:
            # Base query for schedules in date range
            schedules_query = Schedule.objects.filter(date__range=[start_date, end_date])
            if provider_id:
                schedules_query = schedules_query.filter(provider_id=provider_id)
            
            total_schedules = schedules_query.count()
            
            # Count timeslots
            timeslots_query = TimeSlot.objects.filter(
                schedule__date__range=[start_date, end_date]
            )
            if provider_id:
                timeslots_query = timeslots_query.filter(schedule__provider_id=provider_id)
            
            total_timeslots = timeslots_query.count()
            
            # Get pending service demands that could be scheduled
            pending_demands = ServiceDemand.objects.filter(
                status__in=['Pending', 'Approved'],
                preferred_start_date__range=[start_date, end_date]
            ).count()
            
            # Provider utilization (basic calculation)
            providers_count = Provider.objects.count()
            avg_schedules_per_provider = total_schedules / providers_count if providers_count > 0 else 0
            
            return {
                'total_schedules': total_schedules,
                'total_timeslots': total_timeslots,
                'pending_demands': pending_demands,
                'avg_schedules_per_provider': round(avg_schedules_per_provider, 2),
                'utilization_rate': min(100, round((total_timeslots / (providers_count * 16)) * 100, 2)) if providers_count > 0 else 0  # Assuming 8 hour days = 16 slots of 30min
            }
        except Exception as e:
            return {
                'total_schedules': 0,
                'total_timeslots': 0,
                'pending_demands': 0,
                'avg_schedules_per_provider': 0,
                'utilization_rate': 0
            }


class QuickScheduleView(APIView):
    """
    Quick scheduling actions for coordinators
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a quick schedule/appointment"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            data = request.data
            
            # Required fields
            provider_id = data.get('provider_id')
            patient_id = data.get('patient_id')
            date_str = data.get('date')
            start_time_str = data.get('start_time')
            end_time_str = data.get('end_time')
            service_id = data.get('service_id')
            description = data.get('description', '')
            
            # Validate required fields
            if not all([provider_id, patient_id, date_str, start_time_str, end_time_str]):
                return Response({
                    'error': 'Missing required fields: provider_id, patient_id, date, start_time, end_time'
                }, status=400)
            
            # Parse and validate data
            provider = Provider.objects.get(id=provider_id)
            patient = Patient.objects.get(id=patient_id)
            schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            service = None
            if service_id:
                service = Service.objects.get(id=service_id)
            
            # Check for conflicts
            existing_schedules = Schedule.objects.filter(
                provider=provider,
                date=schedule_date,
                time_slots__start_time__lt=end_time,
                time_slots__end_time__gt=start_time
            )
            
            if existing_schedules.exists():
                return Response({
                    'error': 'Time conflict detected. Provider already has an appointment during this time.'
                }, status=409)
              # Create schedule
            schedule = Schedule.objects.create(
                provider=provider,
                patient=patient,
                date=schedule_date,
                created_by=request.user
            )
            
            # Create timeslot
            timeslot = TimeSlot.objects.create(
                start_time=start_time,
                end_time=end_time,
                description=description,
                service=service,
                user=request.user
            )
            
            # Add timeslot to schedule
            schedule.time_slots.add(timeslot)
            
            return Response({
                'message': 'Schedule created successfully',
                'schedule_id': schedule.id,
                'timeslot_id': timeslot.id
            }, status=201)
            
        except Provider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=404)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=404)
        except ValueError as e:
            return Response({'error': f'Invalid date/time format: {str(e)}'}, status=400)
        except Exception as e:
            return Response({'error': f'Failed to create schedule: {str(e)}'}, status=500)


class ScheduleAvailabilityView(APIView):
    """
    Check provider availability for scheduling
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get available time slots for a provider on a specific date"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            provider_id = request.query_params.get('provider_id')
            date_str = request.query_params.get('date')
            
            if not provider_id or not date_str:
                return Response({
                    'error': 'provider_id and date are required'
                }, status=400)
            
            provider = Provider.objects.get(id=provider_id)
            check_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Get existing schedules for this provider on this date
            existing_schedules = Schedule.objects.filter(
                provider=provider,
                date=check_date
            ).prefetch_related('time_slots')
            
            # Get all booked time slots
            booked_slots = []
            for schedule in existing_schedules:
                for timeslot in schedule.time_slots.all():
                    booked_slots.append({
                        'start_time': timeslot.start_time,
                        'end_time': timeslot.end_time,
                        'description': timeslot.description,
                        'patient_name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else 'Unknown'
                    })
            
            # Generate available slots (basic implementation)
            # This is a simplified version - you can enhance with provider-specific working hours
            working_hours = {
                'start': '09:00',
                'end': '17:00',
                'slot_duration': 30  # minutes
            }
            
            available_slots = self.generate_available_slots(
                check_date, 
                working_hours, 
                booked_slots
            )
            
            return Response({
                'provider': {
                    'id': provider.id,
                    'name': f"{provider.user.firstname} {provider.user.lastname}" if provider.user else 'Unknown',
                    'service': provider.service.name if provider.service else 'General'
                },
                'date': check_date,
                'booked_slots': booked_slots,
                'available_slots': available_slots,
                'working_hours': working_hours
            }, status=200)
            
        except Provider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=404)
        except ValueError as e:
            return Response({'error': f'Invalid date format: {str(e)}'}, status=400)
        except Exception as e:
            return Response({'error': f'Failed to check availability: {str(e)}'}, status=500)
    
    def generate_available_slots(self, date, working_hours, booked_slots):
        """Generate available time slots"""
        try:
            start_time = datetime.strptime(working_hours['start'], '%H:%M').time()
            end_time = datetime.strptime(working_hours['end'], '%H:%M').time()
            slot_duration = working_hours['slot_duration']
            
            available_slots = []
            current_time = datetime.combine(date, start_time)
            end_datetime = datetime.combine(date, end_time)
            
            while current_time < end_datetime:
                slot_end = current_time + timedelta(minutes=slot_duration)
                
                # Check if this slot conflicts with any booked slot
                is_available = True
                for booked in booked_slots:
                    booked_start = datetime.combine(date, booked['start_time'])
                    booked_end = datetime.combine(date, booked['end_time'])
                    
                    if (current_time < booked_end and slot_end > booked_start):
                        is_available = False
                        break
                
                if is_available and slot_end <= end_datetime:
                    available_slots.append({
                        'start_time': current_time.time().strftime('%H:%M'),
                        'end_time': slot_end.time().strftime('%H:%M'),
                        'duration_minutes': slot_duration
                    })
                
                current_time = slot_end
            
            return available_slots
            
        except Exception as e:
            return []
