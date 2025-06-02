from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
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
            ).select_related('patient__user', 'provider__user')
            
            # Filter by provider if specified
            if provider_id:
                schedules_query = schedules_query.filter(provider_id=provider_id)
            
            schedules = schedules_query.all()
            
            # Get all timeslots for these schedules
            schedule_ids = [schedule.id for schedule in schedules]
            timeslots = TimeSlot.objects.filter(
                schedule__in=schedule_ids
            ).select_related('service', 'prescription')
            
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
                    'timeslots': []
                }
                
                for timeslot in schedule_timeslots:
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
                        'status': 'scheduled',  # We'll enhance this later
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
                date=schedule_date
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


class AppointmentManagementView(APIView):
    """
    Manage individual appointments (edit/delete)
    """
    permission_classes = [IsAuthenticated]
    
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
            description = data.get('description', '')
            
            # Update schedule fields if provided
            if provider_id:
                provider = Provider.objects.get(id=provider_id)
                schedule.provider = provider
            
            if patient_id:
                patient = Patient.objects.get(id=patient_id)
                schedule.patient = patient
            
            if date_str:
                schedule.date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Handle timeslot updates
            if start_time_str or end_time_str or service_id or description:
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
                    
                    # Check for conflicts before saving
                    if start_time_str or end_time_str or date_str or provider_id:
                        existing_schedules = Schedule.objects.filter(
                            provider=schedule.provider,
                            date=schedule.date,
                            time_slots__start_time__lt=timeslot.end_time,
                            time_slots__end_time__gt=timeslot.start_time
                        ).exclude(id=schedule.id)
                        
                        if existing_schedules.exists():
                            return Response({
                                'error': 'Time conflict detected. Provider already has an appointment during this time.'
                            }, status=409)
                    
                    timeslot.save()
            
            schedule.save()
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
        """Delete an appointment"""
        if request.user.role not in ['Coordinator', 'Administrative']:
            return Response({"error": "Permission denied."}, status=403)
        
        try:
            # Get the timeslot_id from query parameters if provided
            timeslot_id = request.query_params.get('timeslot_id')
            
            schedule = Schedule.objects.get(id=appointment_id)
            timeslots = schedule.time_slots.all()
            
            if timeslot_id:
                # Delete specific timeslot
                try:
                    specific_timeslot = timeslots.get(id=timeslot_id)
                    schedule.time_slots.remove(specific_timeslot)
                    specific_timeslot.delete()
                    
                    # If no more timeslots, delete the schedule
                    if schedule.time_slots.count() == 0:
                        schedule.delete()
                        
                except TimeSlot.DoesNotExist:
                    return Response({'error': 'Timeslot not found'}, status=404)
            else:
                # Original behavior: delete all timeslots and schedule
                # But let's be smarter about it
                timeslot_count = timeslots.count()
                if timeslot_count == 1:
                    # Only one timeslot, delete everything
                    timeslots.first().delete()
                    schedule.delete()
                elif timeslot_count > 1:
                    # Multiple timeslots, delete the first one only
                    # In practice, we should get timeslot_id to know which one to delete
                    first_timeslot = timeslots.first()
                    schedule.time_slots.remove(first_timeslot)
                    first_timeslot.delete()
                else:
                    # No timeslots, just delete the schedule
                    schedule.delete()
            
            return Response({
                'message': 'Appointment deleted successfully'
            }, status=200)
            
        except Schedule.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=404)
        except Exception as e:
            return Response({'error': f'Failed to delete appointment: {str(e)}'}, status=500)


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
        
        try:
            # Get the patient record for the current user
            try:
                patient = Patient.objects.get(user=request.user)
            except Patient.DoesNotExist:
                return Response({"error": "Patient profile not found."}, status=404)
            
            # Get query parameters
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
                        'name': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
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
                        'description': timeslot.description or 'No additional notes',
                        'status': self.get_appointment_status(schedule.date, timeslot.start_time)
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
                'schedule_data': schedule_data,
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
                        'provider': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
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
                        'provider': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
                        'service': timeslot.service.name if timeslot.service else 'General Consultation'
                    })
            
            return recent[:3]  # Limit to 3 most recent
        except:
            return []


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
                    'description': timeslot.description or 'No additional notes',
                    'status': self.get_appointment_status(schedule.date, timeslot.start_time)
                })
            
            appointment_detail = {
                'id': schedule.id,
                'date': schedule.date,
                'provider': {
                    'id': schedule.provider.id if schedule.provider else None,
                    'name': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
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
            # Get the patient_id from query parameters if provided
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
                        },
                        "schedules": []
                    }
                
                # Get timeslots for this schedule
                schedule_timeslots = timeslots_by_schedule.get(schedule.id, [])
                
                appointment_data = {
                    'id': schedule.id,
                    'date': schedule.date,
                    'provider': {
                        'id': schedule.provider.id if schedule.provider else None,
                        'name': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
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
                        'description': timeslot.description or 'No additional notes',
                        'status': self.get_appointment_status(schedule.date, timeslot.start_time)
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
                    'description': timeslot.description or 'No additional notes',
                    'status': self.get_appointment_status(schedule.date, timeslot.start_time)
                })
            
            appointment_detail = {
                'id': schedule.id,
                'date': schedule.date,
                'provider': {
                    'id': schedule.provider.id if schedule.provider else None,
                    'name': f"Dr. {schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule.provider and schedule.provider.user else 'Provider TBD',
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
