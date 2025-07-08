from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from datetime import datetime, timedelta, date
from django.db.models import Q, Count, Avg
from CareLink.models import Schedule, TimeSlot, Provider, Patient, Service, ServiceDemand, UserActionLog, Prescription, PatientServicePrice
from account.serializers.user import UserSerializer
from account.services.notification_service import NotificationService
from .conflict_manager import ConflictManager
import calendar
import re

def log_schedule_action(user, action_type, target_model, target_id, schedule=None, description=None, additional_data=None):
    """
    Enhanced logging function for schedule-related actions
    
    Args:
        user: The user who performed the action
        action_type: Type of action (CREATE_SCHEDULE, UPDATE_APPOINTMENT, DELETE_APPOINTMENT)
        target_model: Model name (Schedule, TimeSlot)
        target_id: ID of the target object
        schedule: Schedule object to extract patient/provider info
        description: Optional description of the action
        additional_data: Optional dict with additional context
    """
    log_data = {
        'user': user,
        'action_type': action_type,
        'target_model': target_model,
        'target_id': target_id,
        'description': description,
        'additional_data': additional_data
    }
    
    # Extract patient and provider information if schedule is provided
    if schedule:
        if schedule.patient:
            log_data['affected_patient_id'] = schedule.patient.id
            log_data['affected_patient_name'] = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient.user else f"Patient ID: {schedule.patient.id}"
        
        if schedule.provider:
            log_data['affected_provider_id'] = schedule.provider.id
            log_data['affected_provider_name'] = f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider.user else f"Provider ID: {schedule.provider.id}"
    
    UserActionLog.objects.create(**log_data)

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
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        view_type = request.query_params.get('view', 'week')  # day, week, month
        provider_id = request.query_params.get('provider_id')
        status = request.query_params.get('status')
        
        try:
            # Parse dates or use defaults
            if start_date_param:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            else:
                start_date = date.today()
                
            if end_date_param:
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
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
                else:                end_date = start_date + timedelta(days=6)

            # Get schedules within date range
            schedules_query = Schedule.objects.filter(
                date__range=[start_date, end_date]
            ).select_related('patient__user', 'provider__user', 'created_by')
            
            # Filter by provider if specified
            if provider_id:
                schedules_query = schedules_query.filter(provider_id=provider_id)
            
            schedules = schedules_query.all()
              # Get all timeslots for these schedules
            schedule_ids = [schedule.id for schedule in schedules]
            timeslots_query = TimeSlot.objects.filter(
                schedule__in=schedule_ids
            ).select_related('service', 'prescription')
            
            # Filter by status if specified
            if status:
                timeslots_query = timeslots_query.filter(status=status)
            
            timeslots = timeslots_query.all()
            
            # Debug: Print timeslots with INAMI data
            for ts in timeslots:
                if hasattr(ts, 'inami_data') and ts.inami_data:
                    print(f"[ScheduleCalendarView] TimeSlot {ts.id} has INAMI data: {ts.inami_data}")
            
            # Build calendar data structure
            calendar_data = []
            
            for schedule in schedules:
                # Get timeslots for this schedule
                schedule_timeslots = [ts for ts in timeslots if ts.schedule_set.filter(id=schedule.id).exists()]
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
                    'created_at': schedule.created_at.isoformat() if hasattr(schedule, 'created_at') and schedule.created_at else None,
                    'timeslots': []
                }
                
                for timeslot in schedule_timeslots:
                    # Debug INAMI data
                    inami_data = timeslot.inami_data if hasattr(timeslot, 'inami_data') and timeslot.inami_data else None
                    if inami_data:
                        print(f"[ScheduleCalendarView] Including INAMI data for timeslot {timeslot.id}: {inami_data}")
                    
                    timeslot_data = {
                        'id': timeslot.id,
                        'start_time': timeslot.start_time,
                        'end_time': timeslot.end_time,
                        'description': timeslot.description,
                        'service': {
                            'id': timeslot.service.id if timeslot.service else None,
                            'name': timeslot.service.name if timeslot.service else 'No Service',
                            'price': float(timeslot.service.price) if timeslot.service else 0
                        },
                        'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled',
                        'notes': timeslot.description or '',
                        'inami_data': inami_data,
                        'prescription': None
                    }
                    
                    # Add prescription data if linked
                    if hasattr(timeslot, 'prescription') and timeslot.prescription:
                        # Extract service demand ID from prescription note
                        service_demand_id = self.extract_service_demand_id(timeslot.prescription.note)
                        
                        timeslot_data['prescription'] = {
                            'id': timeslot.prescription.id,
                            'medication': timeslot.prescription.medication,
                            'instructions': timeslot.prescription.instructions,
                            'start_date': timeslot.prescription.start_date,
                            'end_date': timeslot.prescription.end_date,
                            'frequency': timeslot.prescription.frequency,
                            'status': timeslot.prescription.status,
                            'service_demand_id': service_demand_id,
                            'note': timeslot.prescription.note
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
    
    def extract_service_demand_id(self, note):
        """Extract service demand ID from prescription note"""
        if not note:
            print(f"🔍 DEBUG: No note provided for extraction")
            return None
        try:
            # Extract ID from note format: "Created from Service Demand #12: Title"
            match = re.search(r'Service Demand #(\d+):', note)
            print(f"🔍 DEBUG: Extracting from note: {note}")
            print(f"🔍 DEBUG: Regex match: {match}")
            if match:
                service_demand_id = int(match.group(1))
                print(f"🔍 DEBUG: Extracted service_demand_id: {service_demand_id}")
                return service_demand_id
        except Exception as e:
            print(f"🔍 DEBUG: Error extracting service_demand_id: {e}")
            pass
        print(f"🔍 DEBUG: No service_demand_id found")
        return None
    
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
            
            # Validate required fields - patient_id is optional for blocked time
            if not all([provider_id, date_str, start_time_str, end_time_str]):
                return Response({
                    'error': 'Missing required fields: provider_id, date, start_time, end_time'
                }, status=400)
              # Parse and validate data
            provider = Provider.objects.get(id=provider_id)
            patient = None
            if patient_id:
                patient = Patient.objects.get(id=patient_id)
            schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            service = None
            if service_id:
                service = Service.objects.get(id=service_id)
              # Check for conflicts using ConflictManager (only if patient is provided)
            conflict_result = {'has_conflicts': False}  # Default for blocked time
            if patient_id:
                conflict_result = ConflictManager.check_scheduling_conflicts(
                    provider_id=provider_id,
                    patient_id=patient_id,
                    date=schedule_date,
                    start_time=start_time,
                    end_time=end_time
                )
            
            # If there are conflicts and force_schedule is not set, return conflict details
            force_schedule = data.get('force_schedule', False)
            if conflict_result['has_conflicts'] and not force_schedule:
                return Response({
                    'error': 'Scheduling conflicts detected',
                    'conflict_details': conflict_result,
                    'requires_confirmation': True
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

            # Handle prescription linking from ServiceDemand
            prescription_id = data.get('prescription_id')
            if prescription_id:
                try:
                    if prescription_id and prescription_id != '':
                        service_demand = ServiceDemand.objects.get(id=prescription_id)
                        
                        # Create or get Prescription object from ServiceDemand
                        note_text = f"Created from Service Demand #{service_demand.id}: {service_demand.title}"
                        prescription, created = Prescription.objects.get_or_create(
                            medication=service_demand.description or service_demand.title,
                            start_date=service_demand.preferred_start_date or timezone.now().date(),
                            service=service_demand.service,
                            defaults={
                                'end_date': None,
                                'note': note_text,
                                'status': 'accepted',
                                'frequency': 1,
                                'instructions': service_demand.special_instructions or ''
                            }
                        )
                        
                        # Set prescription on timeslot
                        timeslot.prescription = prescription
                        print(f"[QuickSchedule] Prescription {prescription.id} linked to timeslot {timeslot.id}")
                except (ServiceDemand.DoesNotExist, ValueError) as e:
                    print(f"Warning: Could not set prescription {prescription_id}: {e}")
                except Exception as e:
                    print(f"Error handling prescription: {e}")

            # Handle INAMI data for Service 3 (Soins Infirmiers)
            inami_data = data.get('inami_data')
            if service and service.id == 3 and inami_data:
                timeslot.inami_data = inami_data
                print(f"[QuickSchedule] INAMI data saved for timeslot {timeslot.id}: {inami_data}")

            # Save timeslot with all updates
            timeslot.save()

            # Add timeslot to schedule
            schedule.time_slots.add(timeslot)
              # Log the CREATE_SCHEDULE action
            log_schedule_action(request.user, "CREATE_SCHEDULE", "Schedule", schedule.id, schedule=schedule)
            
            # Create notification for new appointment
            try:
                NotificationService.notify_schedule_created(
                    schedule=schedule,
                    created_by=request.user
                )
            except Exception as e:
                # Log notification error but don't fail the creation
                print(f"Failed to create notification for new schedule: {e}")
            
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


class AppointmentManagementView(APIView):
    """
    Manage individual appointments (edit/delete)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, appointment_id):
        """Get appointment details"""
        if request.user.role not in ['Coordinator', 'Administrative', 'Provider']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            # Get the schedule (appointment)
            schedule = Schedule.objects.get(id=appointment_id)
            
            # Build timeslots data
            timeslots_data = []
            for timeslot in schedule.time_slots.all():
                timeslot_data = {
                    'id': timeslot.id,
                    'start_time': timeslot.start_time.strftime('%H:%M') if timeslot.start_time else None,
                    'end_time': timeslot.end_time.strftime('%H:%M') if timeslot.end_time else None,
                    'description': timeslot.description or '',
                    'status': timeslot.status or 'scheduled',
                    'service': {
                        'id': timeslot.service.id,
                        'name': timeslot.service.name
                    } if timeslot.service else None,
                    'inami_data': timeslot.inami_data if timeslot.inami_data else None,
                }
                
                # Add prescription data from inami_data if exists
                if timeslot.inami_data and 'prescription_ref' in timeslot.inami_data:
                    prescription_ref = timeslot.inami_data['prescription_ref']
                    timeslot_data['prescription'] = {
                        'id': prescription_ref.get('id'),
                        'title': prescription_ref.get('title', ''),
                        'description': prescription_ref.get('description', ''),
                        'service_name': prescription_ref.get('service_name'),
                    }
                
                timeslots_data.append(timeslot_data)
            
            # Build appointment response
            appointment_data = {
                'id': schedule.id,
                'date': schedule.date.strftime('%Y-%m-%d'),
                'provider': {
                    'id': schedule.provider.id,
                    'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider.user else f"Provider {schedule.provider.id}",
                } if schedule.provider else None,
                'patient': {
                    'id': schedule.patient.id,
                    'name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else f"Patient {schedule.patient.id}" if schedule.patient else None,
                } if schedule.patient else None,
                'timeslots': timeslots_data,
                'created_at': schedule.created_at.isoformat() if schedule.created_at else None,
                'created_by': {
                    'name': f"{schedule.created_by.firstname} {schedule.created_by.lastname}" if schedule.created_by else None,
                    'email': schedule.created_by.email if schedule.created_by else None,
                } if hasattr(schedule, 'created_by') and schedule.created_by else None,
            }
            
            return Response(appointment_data, status=200)
            
        except Schedule.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
        except Exception as e:
            return Response({'error': f'Failed to fetch appointment: {str(e)}'}, status=500)
    
    def put(self, request, appointment_id):
        """Update an existing appointment"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            data = request.data
            
            # Get the schedule (appointment) to update
            schedule = Schedule.objects.get(id=appointment_id)
            
            # Extract update data
            provider_id = data.get('provider_id')
            patient_id = data.get('patient_id')
            date_str = data.get('date')
            start_time_str = data.get('start_time')
            end_time_str = data.get('end_time')
            service_id = data.get('service_id')
            prescription_id = data.get('prescription_id')
            description = data.get('description', '')
            
            # Update schedule fields if provided
            if provider_id:
                provider = Provider.objects.get(id=provider_id)
                schedule.provider = provider            
            if patient_id:
                patient = Patient.objects.get(id=patient_id)
                schedule.patient = patient
            elif patient_id == '':
                # Handle case where patient_id is explicitly set to empty string (blocked time)
                schedule.patient = None
            
            if date_str:
                schedule.date = datetime.strptime(date_str, '%Y-%m-%d').date()
              # Handle timeslot updates
            status = data.get('status')
            if start_time_str or end_time_str or service_id or prescription_id or description or status:
                # Get the first timeslot (assuming one timeslot per appointment for now)
                timeslot = schedule.time_slots.first()                
                if timeslot:
                    if start_time_str:
                        timeslot.start_time = datetime.strptime(start_time_str, '%H:%M').time()
                    if end_time_str:
                        timeslot.end_time = datetime.strptime(end_time_str, '%H:%M').time()
                    if description:
                        timeslot.description = description
                    if service_id:
                        service = Service.objects.get(id=service_id) if service_id else None
                        timeslot.service = service
                    if prescription_id:
                        # Handle prescription linking properly
                        try:
                            from CareLink.models import ServiceDemand
                            if prescription_id and prescription_id != '':
                                service_demand = ServiceDemand.objects.get(id=prescription_id)
                                
                                # Create or get Prescription object from ServiceDemand
                                from CareLink.models import Prescription
                                
                                # Use a unique combination to avoid duplicates
                                note_text = f"Created from Service Demand #{service_demand.id}: {service_demand.title}"
                                prescription, created = Prescription.objects.get_or_create(
                                    medication=service_demand.description or service_demand.title,
                                    start_date=service_demand.preferred_start_date or timezone.now().date(),
                                    service=service_demand.service,
                                    defaults={
                                        'end_date': None,  # Set as needed
                                        'note': note_text,
                                        'status': 'accepted',  # Default status
                                        'frequency': 1,  # Default frequency
                                        'instructions': service_demand.special_instructions or ''
                                    }
                                )
                                
                                print(f"🔍 DEBUG: Created prescription with note: {note_text}")
                                print(f"🔍 DEBUG: Prescription ID: {prescription.id}")
                                print(f"🔍 DEBUG: Service Demand ID: {service_demand.id}")
                                
                                # Set prescription on timeslot only (Schedule model doesn't have prescription field)
                                timeslot.prescription = prescription
                            else:
                                # Clear prescription reference if empty
                                timeslot.prescription = None
                        except (ServiceDemand.DoesNotExist, ValueError) as e:
                            print(f"Warning: Could not set prescription {prescription_id}: {e}")
                        except Exception as e:
                            print(f"Error handling prescription: {e}")
                    if status:
                        # Update the status field if provided
                        timeslot.status = status

                    # Handle INAMI data for Service 3 (Soins Infirmiers)
                    inami_data = data.get('inami_data')
                    if service_id and service_id == 3 and inami_data:
                        timeslot.inami_data = inami_data
                        print(f"[AppointmentManagement] INAMI data updated for timeslot {timeslot.id}: {inami_data}")
                    elif service_id and service_id != 3:
                        # Clear INAMI data if service is changed from 3 to something else
                        timeslot.inami_data = None                    # Check for conflicts before saving using ConflictManager
                    if start_time_str or end_time_str or date_str or provider_id:
                        conflict_result = ConflictManager.check_scheduling_conflicts(
                            provider_id=schedule.provider.id,
                            patient_id=schedule.patient.id if schedule.patient else None,
                            date=schedule.date,
                            start_time=timeslot.start_time,
                            end_time=timeslot.end_time,
                            exclude_schedule_id=schedule.id,
                            exclude_timeslot_id=timeslot.id
                        )
                        
                        # If there are conflicts and force_update is not set, return conflict details
                        force_update = data.get('force_update', False)
                        if conflict_result['has_conflicts'] and not force_update:
                            return Response({
                                'error': 'Scheduling conflicts detected',
                                'conflict_details': conflict_result,
                                'requires_confirmation': True
                            }, status=409)
                    
                    timeslot.save()
                    schedule.save()
            
            # Log the UPDATE_APPOINTMENT action
            log_schedule_action(request.user, "UPDATE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
            
            # Create notification for appointment modification
            try:
                changes = []
                if provider_id:
                    changes.append('provider')
                if patient_id:
                    changes.append('patient')
                if date_str:
                    changes.append('date')
                if start_time_str or end_time_str:
                    changes.append('time')
                if service_id:
                    changes.append('service')
                if prescription_id:
                    changes.append('prescription')
                if status:
                    changes.append('status')
                
                NotificationService.notify_schedule_updated(
                    schedule=schedule,
                    updated_by=request.user,
                    changes=changes
                )
            except Exception as e:
                # Log notification error but don't fail the update
                print(f"Failed to create notification for schedule update: {e}")
            
            return Response({
                'message': 'Appointment updated successfully',
                'appointment_id': schedule.id
            }, status=200)
            
        except Schedule.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
        except Provider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=404)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=404)
        except ValueError as e:
            return Response({'error': f'Invalid date/time format: {str(e)}'}, status=400)
        except Exception as e:
            return Response({'error': f'Failed to update appointment: {str(e)}'}, status=500)
    
    def delete(self, request, appointment_id):
        """Delete an appointment with improved logic to prevent orphaned schedules"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            # Get the timeslot_id from query parameters if provided
            timeslot_id = request.query_params.get('timeslot_id')
            # Get deletion strategy from query parameters (default: 'smart')
            deletion_strategy = request.query_params.get('strategy', 'smart')
            
            schedule = Schedule.objects.get(id=appointment_id)
            timeslots = schedule.time_slots.all()
            
            if timeslot_id:                # Delete specific timeslot
                try:
                    specific_timeslot = timeslots.get(id=timeslot_id)
                    timeslot_id_for_log = specific_timeslot.id  # Store ID before deletion
                    schedule.time_slots.remove(specific_timeslot)
                    specific_timeslot.delete()
                    
                    # Apply deletion strategy
                    remaining_timeslots = schedule.time_slots.count()
                    
                    if deletion_strategy == 'aggressive' or remaining_timeslots == 0:
                        # Always delete schedule when any timeslot is deleted (aggressive)
                        # OR when no timeslots remain (default behavior)
                        schedule.delete()
                        
                        # Log the DELETE_APPOINTMENT action
                        log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                        
                        # Create notification for appointment cancellation
                        try:
                            NotificationService.notify_schedule_cancelled(
                                schedule=schedule,
                                cancelled_by=request.user,
                                reason="Appointment cancelled by coordinator"
                            )
                        except Exception as e:
                            # Log notification error but don't fail the deletion
                            print(f"Failed to create notification for schedule cancellation: {e}")
                        
                        return Response({
                            'message': 'Timeslot and schedule deleted successfully',
                            'deletion_type': 'schedule_deleted'                        }, status=200)
                    elif deletion_strategy == 'conservative':
                        # Keep schedule even if no timeslots remain (conservative)
                        # Log the DELETE_APPOINTMENT action (timeslot only)
                        log_schedule_action(
                            user=request.user,
                            action_type="DELETE_APPOINTMENT",
                            target_model="TimeSlot",
                            target_id=timeslot_id_for_log,
                            schedule=schedule,
                            description=f"Deleted timeslot {timeslot_id_for_log} using conservative strategy"
                        )
                        
                        return Response({
                            'message': 'Timeslot deleted successfully, schedule preserved',
                            'deletion_type': 'timeslot_only',
                            'remaining_timeslots': remaining_timeslots
                        }, status=200)
                    else:  # 'smart' strategy (default)
                        # Delete schedule only if no timeslots remain (current behavior)
                        if remaining_timeslots == 0:
                            # Create notification before deleting schedule
                            try:
                                NotificationService.notify_schedule_cancelled(
                                    schedule=schedule,
                                    cancelled_by=request.user,
                                    reason="Appointment cancelled by coordinator"
                                )
                            except Exception as e:
                                print(f"Failed to create notification for schedule cancellation: {e}")
                            
                            schedule.delete()
                            
                            # Log the DELETE_APPOINTMENT action
                            log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                            
                            return Response({
                                'message': 'Last timeslot deleted, schedule removed',
                                'deletion_type': 'schedule_deleted'
                            }, status=200)
                        else:
                            # Log the DELETE_APPOINTMENT action (timeslot only)
                            log_schedule_action(
                                user=request.user,
                                action_type="DELETE_APPOINTMENT",
                                target_model="TimeSlot",
                                target_id=timeslot_id_for_log,
                                schedule=schedule,
                                description=f"Deleted timeslot {timeslot_id_for_log} using smart strategy"
                            )
                            
                            return Response({
                                'message': 'Timeslot deleted successfully',
                                'deletion_type': 'timeslot_only',
                                'remaining_timeslots': remaining_timeslots
                            }, status=200)
                        
                except TimeSlot.DoesNotExist:
                    return Response({'error': 'Timeslot not found'}, status=404)
            else:                   
            # Delete entire appointment/schedule
                if deletion_strategy == 'timeslot_only':
                    # Delete all timeslots but keep schedule
                    for timeslot in timeslots:
                        schedule.time_slots.remove(timeslot)
                        timeslot.delete()
                    
                    # Log the DELETE_APPOINTMENT action (timeslots only)
                    log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                    
                    return Response({
                        'message': 'All timeslots deleted, schedule preserved',
                        'deletion_type': 'timeslots_only'
                    }, status=200)
                else:
                    # Delete everything (default behavior)
                    timeslot_count = timeslots.count()
                    schedule_id = schedule.id  # Store ID before deletion
                    
                    # Create notification before deleting schedule
                    try:
                        NotificationService.notify_schedule_cancelled(
                            schedule=schedule,
                            cancelled_by=request.user,
                            reason="Appointment cancelled by coordinator"
                        )
                    except Exception as e:
                        print(f"Failed to create notification for schedule cancellation: {e}")
                    
                    for timeslot in timeslots:
                        timeslot.delete()
                    schedule.delete()
                    
                    # Log the DELETE_APPOINTMENT action
                    log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule_id, schedule=schedule)
                    
                    return Response({
                        'message': f'Appointment deleted successfully ({timeslot_count} timeslots removed)',
                        'deletion_type': 'complete_deletion'
                    }, status=200)
            
        except Schedule.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
        except Exception as e:
            return Response({'error': f'Failed to delete appointment: {str(e)}'}, status=500)


class BulkDeleteAppointmentsView(APIView):
    """
    Bulk delete multiple appointments
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Delete multiple appointments at once"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            data = request.data
            appointment_ids = data.get('appointment_ids', [])
            deletion_strategy = data.get('deletion_strategy', 'smart')  # smart, aggressive, conservative
            
            if not appointment_ids:
                return Response({'error': 'No appointment IDs provided'}, status=400)
            
            if len(appointment_ids) > 50:
                return Response({'error': 'Cannot delete more than 50 appointments at once'}, status=400)
            
            deleted_schedules = []
            deleted_timeslots = []
            errors = []
            
            # Process each appointment
            for appointment_id in appointment_ids:
                try:
                    schedule = Schedule.objects.get(id=appointment_id)
                    timeslots = schedule.time_slots.all()
                    
                    if deletion_strategy == 'aggressive':
                        # Always delete schedule when any timeslot is deleted
                        timeslot_count = timeslots.count()
                        
                        # Create notification before deleting schedule
                        try:
                            NotificationService.notify_schedule_cancelled(
                                schedule=schedule,
                                cancelled_by=request.user,
                                reason="Appointment cancelled via bulk delete"
                            )
                        except Exception as e:
                            print(f"Failed to create notification for schedule cancellation: {e}")
                        
                        for timeslot in timeslots:
                            timeslot.delete()
                        schedule.delete()
                        
                        # Log the DELETE_APPOINTMENT action
                        log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                        
                        deleted_schedules.append({
                            'schedule_id': appointment_id,
                            'timeslots_deleted': timeslot_count,
                            'deletion_type': 'complete_deletion'
                        })
                        
                    elif deletion_strategy == 'conservative':
                        # Delete timeslots but keep schedule (unless no timeslots remain)
                        timeslot_count = timeslots.count()
                        
                        for timeslot in timeslots:
                            schedule.time_slots.remove(timeslot)
                            timeslot.delete()
                        
                        # Check if any timeslots remain
                        remaining_timeslots = schedule.time_slots.count()
                        
                        if remaining_timeslots == 0:
                            # Create notification before deleting schedule
                            try:
                                NotificationService.notify_schedule_cancelled(
                                    schedule=schedule,
                                    cancelled_by=request.user,
                                    reason="Appointment cancelled via bulk delete (no timeslots remaining)"
                                )
                            except Exception as e:
                                print(f"Failed to create notification for schedule cancellation: {e}")
                            
                            schedule.delete()
                            
                            # Log the DELETE_APPOINTMENT action
                            log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                            
                            deleted_schedules.append({
                                'schedule_id': appointment_id,
                                'timeslots_deleted': timeslot_count,
                                'deletion_type': 'schedule_deleted'
                            })
                        else:
                            # Log the DELETE_APPOINTMENT action (timeslots only)
                            log_schedule_action(
                                user=request.user,
                                action_type="DELETE_APPOINTMENT",
                                target_model="Schedule",
                                target_id=appointment_id,
                                schedule=schedule,
                                description=f"Deleted {timeslot_count} timeslots using conservative strategy"
                            )
                            
                            deleted_timeslots.append({
                                'schedule_id': appointment_id,
                                'timeslots_deleted': timeslot_count,
                                'deletion_type': 'timeslots_only',
                                'remaining_timeslots': remaining_timeslots
                            })
                        
                    else:  # 'smart' strategy (default)
                        # Delete schedule only if no timeslots remain after deletion
                        timeslot_count = timeslots.count()
                        
                        for timeslot in timeslots:
                            timeslot.delete()
                        
                        # Create notification before deleting schedule
                        try:
                            NotificationService.notify_schedule_cancelled(
                                schedule=schedule,
                                cancelled_by=request.user,
                                reason="Appointment cancelled via bulk delete"
                            )
                        except Exception as e:
                            print(f"Failed to create notification for schedule cancellation: {e}")
                        
                        schedule.delete()
                        
                        # Log the DELETE_APPOINTMENT action
                        log_schedule_action(request.user, "DELETE_APPOINTMENT", "Schedule", schedule.id, schedule=schedule)
                        
                        deleted_schedules.append({
                            'schedule_id': appointment_id,
                            'timeslots_deleted': timeslot_count,
                            'deletion_type': 'complete_deletion'
                        })
                        
                except Schedule.DoesNotExist:
                    errors.append(f'Appointment {appointment_id} not found')
                    continue
                except Exception as e:
                    errors.append(f'Failed to delete appointment {appointment_id}: {str(e)}')
                    continue
            
            # Calculate summary
            total_schedules_deleted = len(deleted_schedules)
            total_timeslots_deleted = sum(item['timeslots_deleted'] for item in deleted_schedules + deleted_timeslots)
            
            result = {
                'success': True,
                'message': f'Bulk delete completed: {total_schedules_deleted} schedules deleted, {total_timeslots_deleted} timeslots removed',
                'summary': {
                    'total_requested': len(appointment_ids),
                    'schedules_deleted': total_schedules_deleted,
                    'timeslots_preserved': len(deleted_timeslots),
                    'total_timeslots_deleted': total_timeslots_deleted,
                    'deletion_strategy': deletion_strategy
                },
                'details': {
                    'deleted_schedules': deleted_schedules,
                    'deleted_timeslots': deleted_timeslots,
                    'errors': errors
                }
            }
            
            if errors:
                result['message'] += f'. {len(errors)} errors occurred.'
            
            return Response(result, status=200)
            
        except Exception as e:
            return Response({'error': f'Failed to process bulk delete: {str(e)}'}, status=500)


class PatientScheduleView(APIView):
    """
    Patient view to see their own schedules and appointments
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get patient's own schedule data"""
        # Only patients can access this view
        if request.user.role != 'Patient':
            return Response({"error": "Permission denied. Only patients can access this view."}, status=403)
        
        try:            # Get the patient record for the current user
            try:
                patient = Patient.objects.get(user=request.user)
            except Patient.DoesNotExist:
                return Response({"error": "Patient profile not found."}, status=404)
            
            # Get query parameters (handle both DRF and regular Django requests)
            query_params = getattr(request, 'query_params', request.GET)
            start_date = query_params.get('start_date')
            end_date = query_params.get('end_date')
            view_type = query_params.get('view', 'week')  # day, week, month
            
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

            # Get only schedules for this specific patient
            schedules = Schedule.objects.filter(
                patient=patient,
                date__range=[start_date, end_date]
            ).select_related('provider__user').order_by('date')
              # Get all timeslots for these schedules
            timeslots_by_schedule = {}
            for schedule in schedules:
                timeslots_by_schedule[schedule.id] = list(schedule.time_slots.all().select_related('service').order_by('start_time'))
            
            # Build patient's schedule data
            schedule_data = []
            for schedule in schedules:
                # Get timeslots for this schedule
                schedule_timeslots = timeslots_by_schedule.get(schedule.id, [])
                
                appointment_data = {
                    'id': schedule.id,
                    'date': schedule.date,
                    'provider': {
                        'id': schedule.provider.id if schedule.provider else None,
                        'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                        'service_type': schedule.provider.service.name if schedule.provider and schedule.provider.service else 'General Care'
                    },
                    'appointments': []
                }
                
                for timeslot in schedule_timeslots:
                    appointment_info = {
                        'id': timeslot.id,
                        'start_time': timeslot.start_time,
                        'end_time': timeslot.end_time,
                        'duration': self.calculate_duration(timeslot.start_time, timeslot.end_time),
                        'service': {
                            'id': timeslot.service.id if timeslot.service else None,
                            'name': timeslot.service.name if timeslot.service else 'General Consultation',
                            'description': timeslot.service.description if timeslot.service else 'Standard medical consultation'
                        },
                        'prescription': {
                            'id': timeslot.prescription.id if timeslot.prescription else None,
                            'medication': timeslot.prescription.medication if timeslot.prescription else None,
                            'start_date': timeslot.prescription.start_date if timeslot.prescription else None,
                            'note': timeslot.prescription.note if timeslot.prescription else None,
                            'service_demand_id': self.extract_service_demand_id(timeslot.prescription.note) if timeslot.prescription and timeslot.prescription.note else None
                        } if timeslot.prescription else None,
                        'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled'
                    }
                    appointment_data['appointments'].append(appointment_info)
                
                schedule_data.append(appointment_data)
            
            # Get upcoming appointments (next 3)
            upcoming = self.get_upcoming_appointments(patient)
            
            # Get recent appointments (last 3)
            recent = self.get_recent_appointments(patient)
              
            return Response({
                'patient_info': {
                    'id': patient.id,
                    'name': f"{request.user.firstname} {request.user.lastname}",
                    'email': request.user.email
                },
                'appointments': schedule_data,  # Frontend expects 'appointments' key
                'schedule_data': schedule_data,  # Keep for backward compatibility
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'view_type': view_type
                },
                'upcoming_appointments': upcoming,
                'recent_appointments': recent,
                'total_appointments': len(schedule_data)
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to fetch patient schedule: {str(e)}'
            }, status=500)
    
    def calculate_duration(self, start_time, end_time):
        """Calculate appointment duration in minutes"""
        try:
            start_datetime = datetime.combine(date.today(), start_time)
            end_datetime = datetime.combine(date.today(), end_time)
            duration = end_datetime - start_datetime
            return int(duration.total_seconds() / 60)
        except:
            return 0
    
    def get_appointment_status(self, appointment_date, start_time):
        """Determine appointment status based on date and time"""
        try:
            now = timezone.now()
            appointment_datetime = datetime.combine(appointment_date, start_time)
            appointment_datetime = timezone.make_aware(appointment_datetime)
            
            if appointment_datetime > now:
                return 'upcoming'
            elif appointment_datetime.date() == now.date():
                return 'today'
            else:
                return 'completed'
        except:
            return 'unknown'
    
    def get_upcoming_appointments(self, patient):
        """Get next 3 upcoming appointments for the patient"""
        try:
            today = date.today()
            upcoming_schedules = Schedule.objects.filter(
                patient=patient,
                date__gte=today
            ).select_related('provider__user').order_by('date')[:3]
            
            upcoming = []
            for schedule in upcoming_schedules:
                timeslots = schedule.time_slots.all().order_by('start_time')
                for timeslot in timeslots:
                    upcoming.append({
                        'date': schedule.date,
                        'time': timeslot.start_time,
                        'provider': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                        'service': timeslot.service.name if timeslot.service else 'General Consultation'
                    })
            
            return upcoming[:3]  # Limit to 3 most recent
        except:
            return []
    
    def get_recent_appointments(self, patient):
        """Get last 3 completed appointments for the patient"""
        try:
            today = date.today()
            recent_schedules = Schedule.objects.filter(
                patient=patient,
                date__lt=today
            ).select_related('provider__user').order_by('-date')[:3]
            
            recent = []
            for schedule in recent_schedules:
                timeslots = schedule.time_slots.all().order_by('start_time')
                for timeslot in timeslots:
                    recent.append({
                        'date': schedule.date,
                        'time': timeslot.start_time,
                        'provider': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                        'service': timeslot.service.name if timeslot.service else 'General Consultation'
                    })
            
            return recent[:3]  # Limit to 3 most recent
        except:
            return []

    def extract_service_demand_id(self, note):
        """Extract service demand ID from prescription note"""
        if not note:
            print(f"🔍 DEBUG: No note provided for extraction")
            return None
        try:
            # Extract ID from note format: "Created from Service Demand #12: Title"
            match = re.search(r'Service Demand #(\d+):', note)
            print(f"🔍 DEBUG: Extracting from note: {note}")
            print(f"🔍 DEBUG: Regex match: {match}")
            if match:
                service_demand_id = int(match.group(1))
                print(f"🔍 DEBUG: Extracted service_demand_id: {service_demand_id}")
                return service_demand_id
        except Exception as e:
            print(f"🔍 DEBUG: Error extracting service_demand_id: {e}")
            pass
        print(f"🔍 DEBUG: No service_demand_id found")
        return None


class PatientAppointmentDetailView(APIView):
    """
    Patient view to see details of a specific appointment
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, appointment_id):
        """Get detailed information about a specific appointment"""
        # Only patients can access this view
        if request.user.role != 'Patient':
            return Response({"error": "Permission denied. Only patients can access this view."}, status=403)
        
        try:
            # Get the patient record for the current user
            try:
                patient = Patient.objects.get(user=request.user)
            except Patient.DoesNotExist:
                return Response({"error": "Patient profile not found."}, status=404)
            
            # Get the schedule and ensure it belongs to this patient
            try:
                schedule = Schedule.objects.select_related('provider__user').get(
                    id=appointment_id,
                    patient=patient
                )
            except Schedule.DoesNotExist:
                return Response({"error": "Appointment not found or access denied."}, status=404)
            
            # Get all timeslots for this appointment
            timeslots = schedule.time_slots.all().select_related('service').order_by('start_time')
            
            # Build detailed appointment data
            timeslot_details = []
            for timeslot in timeslots:
                timeslot_details.append({
                    'id': timeslot.id,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'duration_minutes': self.calculate_duration(timeslot.start_time, timeslot.end_time),
                    'service': {
                        'id': timeslot.service.id if timeslot.service else None,
                        'name': timeslot.service.name if timeslot.service else 'General Consultation',
                        'description': timeslot.service.description if timeslot.service else 'Standard medical consultation',
                        'price': float(timeslot.service.price) if timeslot.service else 0
                    },
                    'prescription': {
                        'id': timeslot.prescription.id if timeslot.prescription else None,
                        'medication': timeslot.prescription.medication if timeslot.prescription else None,
                        'start_date': timeslot.prescription.start_date if timeslot.prescription else None,
                        'note': timeslot.prescription.note if timeslot.prescription else None,
                        'service_demand_id': self.extract_service_demand_id(timeslot.prescription.note) if timeslot.prescription and timeslot.prescription.note else None
                    } if timeslot.prescription else None,
                    'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled'
                })
            
            appointment_detail = {
                'id': schedule.id,
                'date': schedule.date,
                'provider': {
                    'id': schedule.provider.id if schedule.provider else None,
                    'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                    'email': schedule.provider.user.email if schedule.provider and schedule.provider.user else None,
                    'service_type': schedule.provider.service.name if schedule.provider and schedule.provider.service else 'General Care',
                    'is_internal': schedule.provider.is_internal if schedule.provider else True
                },
                'patient': {
                    'id': patient.id,
                    'name': f"{request.user.firstname} {request.user.lastname}",
                    'email': request.user.email
                },
                'timeslots': timeslot_details,
                'total_duration': sum([ts['duration_minutes'] for ts in timeslot_details]),
                'can_reschedule': self.can_reschedule(schedule.date),
                'can_cancel': self.can_cancel(schedule.date)
            }
            
            return Response({
                'appointment': appointment_detail
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to fetch appointment details: {str(e)}'
            }, status=500)
    
    def calculate_duration(self, start_time, end_time):
        """Calculate appointment duration in minutes"""
        try:
            start_datetime = datetime.combine(date.today(), start_time)
            end_datetime = datetime.combine(date.today(), end_time)
            duration = end_datetime - start_datetime
            return int(duration.total_seconds() / 60)
        except:
            return 0
    
    def get_appointment_status(self, appointment_date, start_time):
        """Determine appointment status based on date and time"""
        try:
            now = timezone.now()
            appointment_datetime = datetime.combine(appointment_date, start_time)
            appointment_datetime = timezone.make_aware(appointment_datetime)
            
            if appointment_datetime > now:
                return 'upcoming'
            elif appointment_datetime.date() == now.date():
                return 'today'
            else:
                return 'completed'
        except:
            return 'unknown'
    
    def can_reschedule(self, appointment_date):
        """Check if appointment can be rescheduled (24 hours in advance)"""
        try:
            today = date.today()
            days_until = (appointment_date - today).days
            return days_until >= 1  # Can reschedule if appointment is at least 1 day away
        except:
            return False
    
    def can_cancel(self, appointment_date):
        """Check if appointment can be cancelled (24 hours in advance)"""
        try:
            today = date.today()
            days_until = (appointment_date - today).days
            return days_until >= 1  # Can cancel if appointment is at least 1 day away
        except:
            return False

    def extract_service_demand_id(self, note):
        """Extract service demand ID from prescription note"""
        if not note:
            print(f"🔍 DEBUG: No note provided for extraction")
            return None
        try:
            # Extract ID from note format: "Created from Service Demand #12: Title"
            match = re.search(r'Service Demand #(\d+):', note)
            print(f"🔍 DEBUG: Extracting from note: {note}")
            print(f"🔍 DEBUG: Regex match: {match}")
            if match:
                service_demand_id = int(match.group(1))
                print(f"🔍 DEBUG: Extracted service_demand_id: {service_demand_id}")
                return service_demand_id
        except Exception as e:
            print(f"🔍 DEBUG: Error extracting service_demand_id: {e}")
            pass
        print(f"🔍 DEBUG: No service_demand_id found")
        return None


class FamilyPatientScheduleView(APIView):
    """
    Family Patient view to see linked patients' schedules and appointments
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get linked patients' schedule data for a family member"""
        # Only family patients can access this view
        if request.user.role != 'Family Patient':
            return Response({"error": "Permission denied. Only family patients can access this view."}, status=403)
        
        try:
            # Get the patient_id from request query parameters
            patient_id = request.query_params.get('patient_id')
            
            # Get linked patients for this family member
            from CareLink.models import FamilyPatient
            family_patients = FamilyPatient.objects.filter(user=request.user)
            
            if not family_patients.exists():
                return Response({"error": "No linked patients found."}, status=404)
            
            # Filter by specific patient if patient_id is provided
            if patient_id:
                family_patients = family_patients.filter(patient_id=patient_id)
                if not family_patients.exists():
                    return Response({"error": f"No linked patient found with ID {patient_id}."}, status=404)
            
            # Get linked patient ids
            linked_patient_ids = [fp.patient_id for fp in family_patients if fp.patient_id]
            
            # Get query parameters for date range
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            view_type = request.query_params.get('view', 'week')  # day, week, month
            
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

            # Get schedules for all linked patients
            schedules = Schedule.objects.filter(
                patient_id__in=linked_patient_ids,
                date__range=[start_date, end_date]
            ).select_related('patient__user', 'provider__user').order_by('date')
            
            # Get all timeslots for these schedules
            timeslots_by_schedule = {}
            for schedule in schedules:
                timeslots_by_schedule[schedule.id] = list(schedule.time_slots.all().select_related('service').order_by('start_time'))
            
            # Group schedules by patient
            patient_schedules = {}
            for schedule in schedules:
                patient_id = schedule.patient_id
                if patient_id not in patient_schedules:
                    # Get relationship for this patient
                    relationship = "Family Member"
                    for fp in family_patients:
                        if fp.patient_id == patient_id:
                            relationship = fp.link
                            break
                    
                    patient_schedules[patient_id] = {
                        "patient_info": {
                            "id": patient_id,
                            "name": f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown",
                            "relationship": relationship
                        },                        "schedules": []
                    }
                
                # Get timeslots for this schedule
                schedule_timeslots = timeslots_by_schedule.get(schedule.id, [])
                
                appointment_data = {
                    'id': schedule.id,
                    'date': schedule.date,
                    'provider': {
                        'id': schedule.provider.id if schedule.provider else None,
                        'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                        'service_type': schedule.provider.service.name if schedule.provider and schedule.provider.service else 'General Care'
                    },
                    'appointments': []
                }
                
                for timeslot in schedule_timeslots:
                    appointment_info = {
                        'id': timeslot.id,
                        'start_time': timeslot.start_time,
                        'end_time': timeslot.end_time,
                        'duration': self.calculate_duration(timeslot.start_time, timeslot.end_time),
                        'service': {
                            'id': timeslot.service.id if timeslot.service else None,
                            'name': timeslot.service.name if timeslot.service else 'General Consultation',
                            'description': timeslot.service.description if timeslot.service else 'Standard medical consultation'
                        },
                        'prescription': {
                            'id': timeslot.prescription.id if timeslot.prescription else None,
                            'medication': timeslot.prescription.medication if timeslot.prescription else None,
                            'start_date': timeslot.prescription.start_date if timeslot.prescription else None,
                            'note': timeslot.prescription.note if timeslot.prescription else None,
                            'service_demand_id': self.extract_service_demand_id(timeslot.prescription.note) if timeslot.prescription and timeslot.prescription.note else None
                        } if timeslot.prescription else None,
                        'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled'
                    }
                    appointment_data['appointments'].append(appointment_info)
                
                patient_schedules[patient_id]['schedules'].append(appointment_data)
            
            return Response({
                'family_member_info': {
                    'id': request.user.id,
                    'name': f"{request.user.firstname} {request.user.lastname}",
                    'email': request.user.email
                },
                'patients': list(patient_schedules.values()),
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'view_type': view_type
                },
                'total_patients': len(patient_schedules)
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to fetch family patient schedules: {str(e)}'
            }, status=500)
    
    def calculate_duration(self, start_time, end_time):
        """Calculate appointment duration in minutes"""
        try:
            start_datetime = datetime.combine(date.today(), start_time)
            end_datetime = datetime.combine(date.today(), end_time)
            duration = end_datetime - start_datetime
            return int(duration.total_seconds() / 60)
        except:
            return 0
    
    def get_appointment_status(self, appointment_date, start_time):
        """Determine appointment status based on date and time"""
        try:
            now = timezone.now()
            appointment_datetime = datetime.combine(appointment_date, start_time)
            appointment_datetime = timezone.make_aware(appointment_datetime)
            
            if appointment_datetime > now:
                return 'upcoming'
            elif appointment_datetime.date() == now.date():
                return 'today'
            else:
                return 'completed'
        except:
            return 'unknown'

    def extract_service_demand_id(self, note):
        """Extract service demand ID from prescription note"""
        if not note:
            print(f"🔍 DEBUG: No note provided for extraction")
            return None
        try:
            # Extract ID from note format: "Created from Service Demand #12: Title"
            match = re.search(r'Service Demand #(\d+):', note)
            print(f"🔍 DEBUG: Extracting from note: {note}")
            print(f"🔍 DEBUG: Regex match: {match}")
            if match:
                service_demand_id = int(match.group(1))
                print(f"🔍 DEBUG: Extracted service_demand_id: {service_demand_id}")
                return service_demand_id
        except Exception as e:
            print(f"🔍 DEBUG: Error extracting service_demand_id: {e}")
            pass
        print(f"🔍 DEBUG: No service_demand_id found")
        return None


class FamilyPatientAppointmentDetailView(APIView):
    """
    Family Patient view to see details of a specific linked patient's appointment
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, appointment_id):
        """Get detailed information about a specific appointment for a linked patient"""
        # Only family patients can access this view
        if request.user.role != 'Family Patient':
            return Response({"error": "Permission denied. Only family patients can access this view."}, status=403)
        
        try:
            # Get the schedule
            try:
                schedule = Schedule.objects.select_related('provider__user', 'patient__user').get(id=appointment_id)
            except Schedule.DoesNotExist:
                return Response({"error": "Appointment not found."}, status=404)
            
            # Check if user has access to this patient's schedule
            from CareLink.models import FamilyPatient
            has_access = FamilyPatient.objects.filter(
                user=request.user,
                patient=schedule.patient
            ).exists()
            
            if not has_access:
                return Response({"error": "Access denied to this patient's appointment."}, status=403)
            
            # Get relationship to patient
            family_patient = FamilyPatient.objects.filter(
                user=request.user,
                patient=schedule.patient
            ).first()
            relationship = family_patient.link if family_patient else "Family Member"
            
            # Get all timeslots for this appointment
            timeslots = schedule.time_slots.all().select_related('service').order_by('start_time')
              # Build detailed appointment data
            timeslot_details = []
            for timeslot in timeslots:
                timeslot_details.append({
                    'id': timeslot.id,
                    'start_time': timeslot.start_time,
                    'end_time': timeslot.end_time,
                    'duration_minutes': self.calculate_duration(timeslot.start_time, timeslot.end_time),
                    'service': {
                        'id': timeslot.service.id if timeslot.service else None,
                        'name': timeslot.service.name if timeslot.service else 'General Consultation',
                        'description': timeslot.service.description if timeslot.service else 'Standard medical consultation',
                        'price': float(timeslot.service.price) if timeslot.service else 0
                    },
                    'prescription': {
                        'id': timeslot.prescription.id if timeslot.prescription else None,
                        'medication': timeslot.prescription.medication if timeslot.prescription else None,
                        'start_date': timeslot.prescription.start_date if timeslot.prescription else None,
                        'note': timeslot.prescription.note if timeslot.prescription else None,
                        'service_demand_id': self.extract_service_demand_id(timeslot.prescription.note) if timeslot.prescription and timeslot.prescription.note else None
                    } if timeslot.prescription else None,
                    'status': timeslot.status if hasattr(timeslot, 'status') and timeslot.status else 'scheduled'
                })
            
            appointment_detail = {
                'id': schedule.id,
                'date': schedule.date,
                'provider': {
                    'id': schedule.provider.id if schedule.provider else None,
                    'name': f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                    'email': schedule.provider.user.email if schedule.provider and schedule.provider.user else None,
                    'service_type': schedule.provider.service.name if schedule.provider and schedule.provider.service else 'General Care',
                    'is_internal': schedule.provider.is_internal if schedule.provider else True
                },
                'patient': {
                    'id': schedule.patient.id,
                    'name': f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else 'Unknown',
                    'relationship': relationship
                },
                'timeslots': timeslot_details,
                'total_duration': sum([ts['duration_minutes'] for ts in timeslot_details]),
                'can_view_comments': True  # Family members can view comments but not modify
            }
            
            return Response({
                'appointment': appointment_detail
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to fetch appointment details: {str(e)}'
            }, status=500)
    
    def calculate_duration(self, start_time, end_time):
        """Calculate appointment duration in minutes"""
        try:
            start_datetime = datetime.combine(date.today(), start_time)
            end_datetime = datetime.combine(date.today(), end_time)
            duration = end_datetime - start_datetime
            return int(duration.total_seconds() / 60)
        except:
            return 0
    
    def get_appointment_status(self, appointment_date, start_time):
        """Determine appointment status based on date and time"""
        try:
            now = timezone.now()
            appointment_datetime = datetime.combine(appointment_date, start_time)
            appointment_datetime = timezone.make_aware(appointment_datetime)
            
            if appointment_datetime > now:
                return 'upcoming'
            elif appointment_datetime.date() == now.date():
                return 'today'
            else:
                return 'completed'
        except:
            return 'unknown'
    
    def extract_service_demand_id(self, note):
        """Extract service demand ID from prescription note"""
        if not note:
            print(f"🔍 DEBUG: No note provided for extraction")
            return None
        try:
            # Extract ID from note format: "Created from Service Demand #12: Title"
            match = re.search(r'Service Demand #(\d+):', note)
            print(f"🔍 DEBUG: Extracting from note: {note}")
            print(f"🔍 DEBUG: Regex match: {match}")
            if match:
                service_demand_id = int(match.group(1))
                print(f"🔍 DEBUG: Extracted service_demand_id: {service_demand_id}")
                return service_demand_id
        except Exception as e:
            print(f"🔍 DEBUG: Error extracting service_demand_id: {e}")
            pass
        print(f"🔍 DEBUG: No service_demand_id found")
        return None
        

class RecurringScheduleView(APIView):
    """
    Create recurring schedules with weekly, bi-weekly, or monthly patterns
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request):
        """Create multiple schedule appointments based on recurring pattern"""
        # Only coordinators and admin can create recurring schedules
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            print(f"🔍 DEBUG RecurringSchedule: Raw request data: {request.data}")
            print(f"🔍 DEBUG RecurringSchedule: Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'Not a dict'}")
            
            data = request.data
            
            # Extract basic schedule data
            provider_id = data.get('provider_id')
            patient_id = data.get('patient_id')
            start_time = data.get('start_time')
            end_time = data.get('end_time')
            service_id = data.get('service_id')
            description = data.get('description', '')
            
            # Extract recurring settings
            recurring_settings = data.get('recurring_settings', {})
            dates = recurring_settings.get('dates', [])
            
            # Validate required fields
            if not all([provider_id, patient_id, start_time, end_time]):
                return Response({
                    "error": "Missing required fields: provider_id, patient_id, start_time, end_time"
                }, status=400)
            
            if not dates:
                return Response({
                    "error": "No dates provided for recurring schedule"
                }, status=400)
            
            # Validate provider and patient exist
            try:
                provider = Provider.objects.get(id=provider_id)
                patient = Patient.objects.get(id=patient_id)
            except Provider.DoesNotExist:
                return Response({"error": "Provider not found"}, status=404)
            except Patient.DoesNotExist:
                return Response({"error": "Patient not found"}, status=404)
            
            # Extract additional fields for timeslot creation
            prescription_id = data.get('prescription_id')
            inami_data = data.get('inami_data')
            
            print(f"🔍 DEBUG RecurringSchedule: Received inami_data from request: {inami_data}")
            print(f"🔍 DEBUG RecurringSchedule: inami_data type: {type(inami_data)}")
            print(f"🔍 DEBUG RecurringSchedule: prescription_id: {prescription_id}")
            
            # Handle prescription linking from ServiceDemand (like QuickSchedule)
            prescription = None
            if prescription_id:
                try:
                    if prescription_id and prescription_id != '':
                        service_demand = ServiceDemand.objects.get(id=prescription_id)
                        
                        # Create or get Prescription object from ServiceDemand
                        note_text = f"Created from Service Demand #{service_demand.id}: {service_demand.title}"
                        prescription, created = Prescription.objects.get_or_create(
                            medication=service_demand.description or service_demand.title,
                            start_date=service_demand.preferred_start_date or timezone.now().date(),
                            service=service_demand.service,
                            defaults={
                                'end_date': None,
                                'note': note_text,
                                'status': 'accepted',
                                'frequency': 1,
                                'instructions': service_demand.special_instructions or ''
                            }
                        )
                        print(f"[RecurringSchedule] Prescription {prescription.id} created/found for ServiceDemand {service_demand.id}")
                except (ServiceDemand.DoesNotExist, ValueError) as e:
                    print(f"Warning: Could not set prescription {prescription_id}: {e}")
                except Exception as e:
                    print(f"Error handling prescription: {e}")
            
            # Validate service if provided
            service = None
            if service_id:
                try:
                    service = Service.objects.get(id=service_id)
                except Service.DoesNotExist:
                    return Response({"error": "Service not found"}, status=404)
            
            # Parse time strings
            try:
                start_time_obj = datetime.strptime(start_time, '%H:%M').time()
                end_time_obj = datetime.strptime(end_time, '%H:%M').time()
            except ValueError:
                return Response({
                    "error": "Invalid time format. Use HH:MM format"
                }, status=400)
            
            created_schedules = []
            created_timeslots = []
            errors = []
              # Check for force scheduling parameter
            force_schedule = data.get('force_schedule', False)
            
            # Create schedules for each date
            for date_str in dates:
                try:
                    # Parse date
                    schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    
                    # Check for conflicts using ConflictManager
                    conflict_result = ConflictManager.check_scheduling_conflicts(
                        provider_id=provider_id,
                        patient_id=patient_id,
                        date=schedule_date,
                        start_time=start_time_obj,
                        end_time=end_time_obj
                    )
                    
                    if conflict_result['has_conflicts'] and not force_schedule:
                        # Record detailed conflict information
                        conflict_details = []
                        for conflict in conflict_result['conflicts']:
                            conflict_details.append(conflict['message'])
                        
                        errors.append({
                            "date": date_str,
                            "status": "skipped",
                            "reason": "conflict",
                            "details": conflict_details,
                            "severity": conflict_result['severity']
                        })
                        continue
                    
                    # Check if schedule already exists for this date/provider/patient
                    existing_schedule = Schedule.objects.filter(
                        date=schedule_date,
                        provider=provider,
                        patient=patient
                    ).first()
                    
                    if existing_schedule:
                        # Use existing schedule
                        schedule = existing_schedule
                    else:                        
                        # Create new schedule
                        schedule = Schedule.objects.create(
                            date=schedule_date,
                            provider=provider,
                            patient=patient,
                            created_by=request.user
                        )
                        created_schedules.append(schedule)
                        
                        # Log the CREATE_SCHEDULE action for new schedules
                        log_schedule_action(request.user, "CREATE_SCHEDULE", "Schedule", schedule.id, schedule=schedule)
                        
                        # Create notification for new appointment
                        try:
                            NotificationService.notify_schedule_created(
                                schedule=schedule,
                                created_by=request.user
                            )
                        except Exception as e:
                            # Log notification error but don't fail the creation
                            print(f"Failed to create notification for new recurring schedule: {e}")
                    
                    # Create timeslot with all fields including INAMI data and prescription
                    print(f"🔍 DEBUG RecurringSchedule: About to create timeslot with inami_data: {inami_data}")
                    print(f"🔍 DEBUG RecurringSchedule: inami_data type: {type(inami_data)}")
                    print(f"🔍 DEBUG RecurringSchedule: inami_data is None: {inami_data is None}")
                    
                    timeslot = TimeSlot.objects.create(
                        start_time=start_time_obj,
                        end_time=end_time_obj,
                        service=service,
                        status='scheduled',
                        description=description,
                        prescription=prescription,
                        inami_data=inami_data
                    )
                    
                    print(f"🔍 DEBUG RecurringSchedule: Created timeslot {timeslot.id} with inami_data: {timeslot.inami_data}")
                    if prescription:
                        print(f"🔍 DEBUG RecurringSchedule: Timeslot {timeslot.id} linked to prescription {prescription.id}")
                    
                    # Save timeslot with all updates (prescription, inami_data)
                    timeslot.save()
                    
                    # Link timeslot to schedule
                    schedule.time_slots.add(timeslot)
                    created_timeslots.append(timeslot)
                      
                except ValueError as e:
                    errors.append({
                        "date": date_str,
                        "status": "skipped",
                        "reason": "invalid_format", 
                        "details": [f"Invalid date format: {str(e)}"]
                    })
                except Exception as e:
                    errors.append({
                        "date": date_str,
                        "status": "skipped",
                        "reason": "error",
                        "details": [f"Error: {str(e)}"]
                    })
              # Prepare response with detailed results
            created_details = []
            skipped_details = []
            
            # Process created appointments
            for timeslot in created_timeslots:
                # Find the schedule this timeslot belongs to
                schedule = Schedule.objects.filter(time_slots=timeslot).first()
                if schedule:
                    created_details.append({
                        "id": timeslot.id,
                        "schedule_id": schedule.id,
                        "date": schedule.date.strftime('%Y-%m-%d'),
                        "start_time": timeslot.start_time.strftime('%H:%M'),
                        "end_time": timeslot.end_time.strftime('%H:%M'),
                        "provider": f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else "Unknown Provider",
                        "patient": f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule.patient and schedule.patient.user else "Unknown Patient",
                        "service": timeslot.service.name if timeslot.service else None,
                        "status": timeslot.status
                    })
              # Compile response with clear stats
            response_data = {
                "success": True,
                "results": {
                    "created": created_details,
                    "skipped": errors,  # The errors list now contains detailed information about skipped dates
                    "summary": {
                        "total_requested": len(dates),
                        "total_created": len(created_timeslots),
                        "total_skipped": len(errors),
                        "success_rate": f"{len(created_timeslots) / len(dates) * 100:.1f}%" if dates else "0%"
                    }
                }
            }
            
            # Check if we should return conflict status
            if errors and len(created_timeslots) == 0 and not force_schedule:
                # No appointments were created due to conflicts, return conflict status
                # Get provider and patient names for conflict dialog
                try:
                    provider = Provider.objects.get(id=provider_id)
                    provider_name = f"{provider.user.firstname} {provider.user.lastname}" if provider.user else f"Provider {provider_id}"
                except Provider.DoesNotExist:
                    provider_name = f"Provider {provider_id}"
                
                try:
                    patient = Patient.objects.get(id=patient_id)
                    patient_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else f"Patient {patient_id}"
                except Patient.DoesNotExist:
                    patient_name = f"Patient {patient_id}"
                
                # Find conflicts with highest severity
                conflicts_list = []
                for error in errors:
                    if error.get("reason") == "conflict":
                        for detail in error.get("details", []):
                            conflicts_list.append({
                                "type": "recurring",
                                "severity": error.get("severity", "medium"),
                                "message": detail,
                                "date": error.get("date")
                            })
                
                return Response({
                    'error': 'Scheduling conflicts detected for recurring appointments',
                    'has_conflicts': True,
                    'conflicts': conflicts_list,
                    'severity': 'high' if any(e.get("severity") == "high" for e in errors) else 'medium',
                    'conflict_count': len(conflicts_list),
                    'scheduling_data': {
                        'provider_id': provider_id,
                        'provider_name': provider_name,
                        'patient_id': patient_id,
                        'patient_name': patient_name,
                        'date': dates[0] if dates else '',
                        'start_time': start_time,
                        'end_time': end_time,
                        'recurring_dates': dates,
                        'total_dates': len(dates)
                    },
                    'requires_confirmation': True
                }, status=409)
            
            # Add warning if some appointments couldn't be created
            if errors:
                response_data["warning"] = f"Some appointments could not be created ({len(errors)}/{len(dates)} skipped)"
            
            return Response(response_data, status=201)
            
        except Exception as e:
            return Response({
                "error": f"Server error: {str(e)}"
            }, status=500)


class ConflictCheckView(APIView):
    """
    Check for scheduling conflicts before creating or updating appointments
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Check for conflicts in proposed scheduling"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            data = request.data
            
            # Extract scheduling data
            provider_id = data.get('provider_id')
            patient_id = data.get('patient_id')
            date_str = data.get('date')
            start_time_str = data.get('start_time')
            end_time_str = data.get('end_time')
            exclude_schedule_id = data.get('exclude_schedule_id')  # For updates
            exclude_timeslot_id = data.get('exclude_timeslot_id')  # For updates
              # Validate required fields (patient_id is optional for blocked time)
            if not all([provider_id, date_str, start_time_str, end_time_str]):
                return Response({
                    'error': 'Missing required fields: provider_id, date, start_time, end_time'
                }, status=400)
            
            # Check for conflicts using ConflictManager
            conflict_result = ConflictManager.check_scheduling_conflicts(
                provider_id=provider_id,
                patient_id=patient_id,
                date=date_str,
                start_time=start_time_str,
                end_time=end_time_str,
                exclude_schedule_id=exclude_schedule_id,
                exclude_timeslot_id=exclude_timeslot_id
            )
              # Get provider and patient names for response
            try:
                provider = Provider.objects.get(id=provider_id)
                provider_name = f"{provider.user.firstname} {provider.user.lastname}" if provider.user else f"Provider {provider_id}"
            except Provider.DoesNotExist:
                provider_name = f"Provider {provider_id}"
            
            # Handle patient name (optional for blocked time)
            if patient_id:
                try:
                    patient = Patient.objects.get(id=patient_id)
                    patient_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else f"Patient {patient_id}"
                except Patient.DoesNotExist:
                    patient_name = f"Patient {patient_id}"
            else:
                patient_name = "Blocked Time"
            
            # Calculate duration for attempted schedule info
            try:
                start_time_obj = datetime.strptime(start_time_str, '%H:%M').time()
                end_time_obj = datetime.strptime(end_time_str, '%H:%M').time()
                start_datetime = datetime.combine(datetime.today().date(), start_time_obj)
                end_datetime = datetime.combine(datetime.today().date(), end_time_obj)
                duration_minutes = int((end_datetime - start_datetime).total_seconds() / 60)
                duration_text = f"{duration_minutes // 60}h {duration_minutes % 60}min" if duration_minutes >= 60 else f"{duration_minutes}min"
            except:
                duration_text = "Unknown"
            
            # Enhance conflicts with attempted schedule information
            enhanced_conflicts = []
            for conflict in conflict_result['conflicts']:
                enhanced_conflict = {
                    **conflict,
                    'attempted_schedule': {
                        'date': date_str,
                        'start_time': start_time_str,
                        'end_time': end_time_str,
                        'provider_name': provider_name,
                        'patient_name': patient_name,
                        'duration': duration_text
                    }
                }
                enhanced_conflicts.append(enhanced_conflict)
            
            # Get suggested alternative time slots if there are conflicts
            suggestions = []
            if conflict_result['has_conflicts']:
                suggestions = ConflictManager.get_suggested_time_slots(
                    provider_id=provider_id,
                    date=date_str,
                    duration_minutes=duration_minutes if 'duration_minutes' in locals() else 60,
                    exclude_schedule_id=exclude_schedule_id
                )
            
            return Response({
                'has_conflicts': conflict_result['has_conflicts'],
                'conflicts': enhanced_conflicts,
                'severity': conflict_result['severity'],
                'conflict_count': conflict_result['conflict_count'],
                'scheduling_data': {
                    'provider_id': provider_id,
                    'provider_name': provider_name,
                    'patient_id': patient_id,
                    'patient_name': patient_name,
                    'date': date_str,
                    'start_time': start_time_str,
                    'end_time': end_time_str,
                    'duration': duration_text
                },
                'suggested_alternatives': suggestions
            }, status=200)
            
        except Exception as e:
            return Response({
                'error': f'Failed to check conflicts: {str(e)}'
            }, status=500)

class PrescriptionOptionsView(APIView):
    """
    Get available prescriptions from ServiceDemand for linking to timeslots
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of available prescriptions from ServiceDemands"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            patient_id = request.query_params.get('patient_id')
            
            # Filter ServiceDemands that can be used as prescriptions
            service_demands = ServiceDemand.objects.filter(
                status__in=['Approved', 'In Progress']
            ).select_related('patient__user', 'service', 'sent_by')
            
            # Filter by patient if specified
            if patient_id:
                service_demands = service_demands.filter(patient_id=patient_id)
            
            # Only include demands that don't already have linked timeslots with prescriptions
            prescriptions_data = []
            for demand in service_demands:
                # Check if this ServiceDemand is already linked to a prescription and timeslot
                existing_prescription = Prescription.objects.filter(
                    note__contains=f"Service Demand #{demand.id}"
                ).first()
                
                # Allow multiple timeslots to link to the same prescription
                # We'll track how many timeslots are linked but not block additional ones
                linked_timeslots_count = 0
                if existing_prescription:
                    linked_timeslots_count = TimeSlot.objects.filter(
                        prescription=existing_prescription
                    ).count()
                
                prescriptions_data.append({
                    'id': demand.id,
                    'title': demand.title,
                    'description': demand.description,
                    'service_name': demand.service.name if demand.service else 'No Service',
                    'service_id': demand.service.id if demand.service else None,
                    'patient_name': f"{demand.patient.user.firstname} {demand.patient.user.lastname}" if demand.patient and demand.patient.user else 'Unknown Patient',
                    'priority': demand.priority,
                    'preferred_start_date': demand.preferred_start_date,
                    'frequency': demand.frequency,
                    'status': demand.status,
                    'linked_timeslots_count': linked_timeslots_count,
                    'instructions': demand.special_instructions
                })
            
            return Response({
                'prescriptions': prescriptions_data
            }, status=200)
            
        except Exception as e:
            return Response({'error': f'Failed to fetch prescriptions: {str(e)}'}, status=500)

class PatientServicePriceView(APIView):
    """
    Handle custom pricing for patient-service combinations
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get custom price for a patient-service combination"""
        patient_id = request.query_params.get('patient_id')
        service_id = request.query_params.get('service_id')
        
        if not patient_id or not service_id:
            return Response({"error": "patient_id and service_id required"}, status=400)
        
        try:
            # Check if custom price exists
            custom_price = PatientServicePrice.objects.get(
                patient_id=patient_id, 
                service_id=service_id
            )
            
            return Response({
                "has_custom_price": True,
                "custom_price": custom_price.custom_price,
                "price_type": custom_price.price_type,
                "notes": custom_price.notes,
                "created_by": custom_price.created_by.get_full_name() if custom_price.created_by else None,
                "created_at": custom_price.created_at
            })
            
        except PatientServicePrice.DoesNotExist:
            # No custom price, return service default
            try:
                service = Service.objects.get(id=service_id)
                return Response({
                    "has_custom_price": False,
                    "default_price": service.price,
                    "price_range": {
                        "min": 0.94,
                        "max": 9.97
                    } if service_id == '1' or service_id == '2' else None  # For family help services
                })
            except Service.DoesNotExist:
                return Response({"error": "Service not found"}, status=404)
    
    def post(self, request):
        """Set custom price for a patient-service combination"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied"}, status=403)
        
        patient_id = request.data.get('patient_id')
        service_id = request.data.get('service_id')
        custom_price = request.data.get('custom_price')
        price_type = request.data.get('price_type', 'hourly')
        notes = request.data.get('notes', '')
        
        if not all([patient_id, service_id, custom_price]):
            return Response({"error": "patient_id, service_id, and custom_price required"}, status=400)
        
        try:
            # Validate price range for family help services (aide menager and aide familial)
            if service_id == '1' or service_id == 1 or service_id == '2' or service_id == 2:
                if float(custom_price) < 0.94 or float(custom_price) > 9.97:
                    return Response({
                        "error": "Price must be between €0.94 and €9.97 for family help services"
                    }, status=400)
            
            # Create or update custom price
            custom_price_obj, created = PatientServicePrice.objects.update_or_create(
                patient_id=patient_id,
                service_id=service_id,
                defaults={
                    'custom_price': custom_price,
                    'price_type': price_type,
                    'notes': notes,
                    'created_by': request.user
                }
            )
            
            return Response({
                "success": True,
                "message": "Custom price saved" if created else "Custom price updated",
                "custom_price": custom_price_obj.custom_price,
                "price_type": custom_price_obj.price_type
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)
