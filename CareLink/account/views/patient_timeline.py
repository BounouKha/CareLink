from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from CareLink.models import User, MedicalFolder, InternalNote
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from django.utils.translation import gettext as _
import json

# Import your models - adjust these imports based on your actual model locations
from CareLink.models import User, MedicalFolder, InternalNote, Patient, Schedule, TimeSlot, ServiceDemand
# Add other models as needed for appointments, service demands, etc.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_timeline(request, patient_id):
    """
    Get comprehensive timeline for a patient including all activities
    Only accessible to coordinators and admins
    """
    try:        # Check if user has permission to view patient timeline
        if not (request.user.is_staff or request.user.is_superuser or 
                request.user.role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']):
            return Response({"error": _("Permission denied. Only coordinators can access patient timelines.")}, status=403)
        
        # Get filter parameters
        activity_type = request.GET.get('type', 'all')
        days = request.GET.get('days', '30')
        author_filter = request.GET.get('author', 'all')
          # Calculate date range
        if days != 'all':
            cutoff_date = timezone.now() - timedelta(days=int(days))
            print(f"[DEBUG] Timeline API - Filtering by last {days} days, cutoff_date: {cutoff_date}")        
        else:
            cutoff_date = None
            print(f"[DEBUG] Timeline API - No date filtering (showing all time)")
        
        # Verify patient exists and user has access
        try:
            patient = Patient.objects.get(id=patient_id)
            patient_user = patient.user
        except Patient.DoesNotExist:
            return Response({
                'status': 'error',
                'message': _('Patient not found')
            }, status=status.HTTP_404_NOT_FOUND)
        
        timeline_entries = []
          # 1. MEDICAL FOLDER ENTRIES
        if activity_type in ['all', 'medical']:
            medical_entries = MedicalFolder.objects.filter(patient_id=patient_id)
            print(f"[DEBUG] Found {medical_entries.count()} total medical entries for patient {patient_id}")
            
            if cutoff_date:
                medical_entries = medical_entries.filter(created_at__gte=cutoff_date)
                print(f"[DEBUG] After date filtering: {medical_entries.count()} medical entries")
            
            for entry in medical_entries.order_by('-created_at'):
                print(f"[DEBUG] Medical entry: {entry.id}, created_at: {entry.created_at}")
                try:
                    # Safely get author information
                    author_info = None
                    if entry.user:  # MedicalFolder uses 'user' field, not 'created_by'
                        author_info = {
                            'name': f"{entry.user.firstname or ''} {entry.user.lastname or ''}".strip(),
                            'role': entry.user.role or 'Unknown',
                            'id': entry.user.id
                        }                    # Safely handle text fields - MedicalFolder only has 'note' field
                    note_content = entry.note or 'No medical note'
                    
                    timeline_entries.append({
                        'id': f"medical_{entry.id}",
                        'type': 'medical',
                        'timestamp': entry.created_at.isoformat(),
                        'title_key': 'timeline.medical.title',
                        'title': 'Medical Record',  # fallback
                        'description': note_content[:100] + "..." if len(note_content) > 100 else note_content,
                        'author': author_info,
                        'details': {
                            'note': note_content,
                            'service': entry.service.name if entry.service else None
                        },
                        'importance': 'high' if any(keyword in note_content.lower() for keyword in ['urgent', 'emergency', 'critical']) else 'medium'
                    })
                    print(f"[DEBUG] Successfully created timeline entry for medical record {entry.id}")
                except Exception as e:
                    print(f"[DEBUG] Error creating timeline entry for medical record {entry.id}: {str(e)}")
                    continue
        # 2. INTERNAL NOTES
        if activity_type in ['all', 'internal']:
            internal_notes = InternalNote.objects.filter(patient_id=patient_id)
            print(f"[DEBUG] Found {internal_notes.count()} total internal notes for patient {patient_id}")
            
            if cutoff_date:
                internal_notes = internal_notes.filter(created_at__gte=cutoff_date)
                print(f"[DEBUG] After date filtering: {internal_notes.count()} internal notes")
            
            for note in internal_notes.order_by('-created_at'):
                print(f"[DEBUG] Internal note: {note.id}, created_at: {note.created_at}")
                try:
                    # Safely get author information
                    author_info = None
                    if note.created_by:
                        author_info = {
                            'name': f"{note.created_by.firstname or ''} {note.created_by.lastname or ''}".strip(),
                            'role': note.created_by.role or 'Unknown',
                            'id': note.created_by.id
                        }                    # Safely handle text fields
                    note_content = note.note or 'No content'
                    is_critical = getattr(note, 'is_critical', False)
                    
                    timeline_entries.append({
                        'id': f"internal_{note.id}",
                        'type': 'internal',
                        'timestamp': note.created_at.isoformat(),
                        'title_key': 'timeline.internal.critical' if is_critical else 'timeline.internal.title',
                        'title': 'Critical Internal Note' if is_critical else 'Internal Note',  # fallback
                        'description': note_content[:100] + "..." if len(note_content) > 100 else note_content,
                        'author': author_info,
                        'details': {
                            'content': note_content,
                            'service': note.service.name if note.service else None,
                            'is_critical': is_critical
                        },
                        'importance': 'high' if is_critical else 'low'
                    })
                    print(f"[DEBUG] Successfully created timeline entry for internal note {note.id}")
                except Exception as e:
                    print(f"[DEBUG] Error creating timeline entry for internal note {note.id}: {str(e)}")
                    continue# 3. PROFILE CHANGES (if you have audit logs)        if activity_type in ['all', 'profile']:
            # This would require an audit log system
            # For now, we'll add a placeholder
            try:
                profile_created_time = patient.user.created_at if patient.user and hasattr(patient.user, 'created_at') else timezone.now()
                
                # Only add profile entry if it falls within the date range                
                if cutoff_date is None or profile_created_time >= cutoff_date:                    # Get the actual patient role
                    patient_role = patient.user.role if patient.user and hasattr(patient.user, 'role') else 'Patient'
                    print(f"[DEBUG] Profile creation - Patient role: {patient_role}")
                    
                    timeline_entries.append({
                        'id': f"profile_created_{patient_id}",
                        'type': 'profile',
                        'timestamp': profile_created_time.isoformat(),
                        'title_key': 'timeline.profile.created',
                        'title': 'Patient Profile Created',  # fallback
                        'description_key': 'timeline.profile.createdDesc',
                        'description': 'Patient profile was created in the system',  # fallback
                        'author': {
                            'name': 'System',
                            'role': 'System',
                            'id': None
                        },
                        'details': {
                            'changes': [
                                {'field': 'Account Status', 'old_value': 'None', 'new_value': 'Active'},
                                {'field': 'Role', 'old_value': 'None', 'new_value': patient_role}
                            ]
                        },
                        'importance': 'medium'
                    })
            except Exception as e:
                # If there's an error with profile creation entry, skip it
                pass
          # 4. APPOINTMENTS (Schedule + TimeSlots)
        if activity_type in ['all', 'appointment']:
            schedules = Schedule.objects.filter(patient_id=patient_id)
            print(f"[DEBUG] Found {schedules.count()} total schedules for patient {patient_id}")
            
            if cutoff_date:
                schedules = schedules.filter(created_at__gte=cutoff_date)
                print(f"[DEBUG] After date filtering: {schedules.count()} schedules")
            
            for schedule in schedules.order_by('-created_at'):
                print(f"[DEBUG] Schedule: {schedule.id}, date: {schedule.date}, created_at: {schedule.created_at}")
                try:
                    # Get author information (who created the schedule)
                    author_info = None
                    if schedule.created_by:
                        author_info = {
                            'name': f"{schedule.created_by.firstname or ''} {schedule.created_by.lastname or ''}".strip(),
                            'role': schedule.created_by.role or 'Unknown',
                            'id': schedule.created_by.id
                        }                    # Get provider information
                    provider_name = _("Unknown Provider")
                    if schedule.provider and schedule.provider.user:
                        provider_name = f"{schedule.provider.user.firstname or ''} {schedule.provider.user.lastname or ''}".strip()
                    
                    # Get time slots and format them nicely
                    time_slots_list = list(schedule.time_slots.all())
                    time_slots_count = len(time_slots_list)
                    
                    # Create a simple time display string
                    if time_slots_list:
                        if time_slots_count == 1:
                            time_display = f"{time_slots_list[0].start_time.strftime('%H:%M')}-{time_slots_list[0].end_time.strftime('%H:%M')}"
                        elif time_slots_count <= 3:
                            times = [f"{slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}" for slot in time_slots_list]
                            time_display = f"{', '.join(times)}"
                        else:
                            first_time = time_slots_list[0].start_time.strftime('%H:%M')
                            last_time = time_slots_list[-1].end_time.strftime('%H:%M')
                            time_display = f"{first_time}-{last_time} ({time_slots_count} slots)"
                    else:
                        time_display = ""  # No time slots
                    print(f"[DEBUG] Appointment {schedule.id}: time_slots_count={time_slots_count}, time_display='{time_display}'")
                    
                    # Create schedule entry
                    timeline_entries.append({
                        'id': f"schedule_{schedule.id}",
                        'type': 'appointment',
                        'timestamp': schedule.created_at.isoformat(),
                        'title_key': 'timeline.appointment.title',
                        'title': f"Appointment with {provider_name}",  # fallback
                        'description_key': 'timeline.appointment.scheduledFor',
                        'description': f"Scheduled for {schedule.date}",  # basic fallback
                        'author': author_info,
                        'details': {
                            'schedule_date': schedule.date.isoformat(),
                            'provider': provider_name,
                            'time_slots_count': time_slots_count,
                            'date': schedule.date.strftime('%Y-%m-%d'),
                            'time': time_display,
                            'time_slots': [
                                {
                                    'start_time': slot.start_time.strftime('%H:%M'),
                                    'end_time': slot.end_time.strftime('%H:%M'),
                                    'status': slot.status,
                                    'description': slot.description or 'No description'
                                } for slot in time_slots_list
                            ]
                        },
                        'importance': 'medium'
                    })
                      # Also add individual time slots if they have specific statuses or updates
                    for slot in time_slots_list:
                        if slot.status in ['completed', 'cancelled', 'no_show']:                            timeline_entries.append({
                                'id': f"timeslot_{slot.id}",
                                'type': 'appointment',
                                'timestamp': schedule.date.isoformat(),  # Use appointment date
                                'title_key': f'timeline.appointment.status.{slot.status}',
                                'title': f"Appointment {slot.status.title()}",  # fallback
                                'description': f"Time slot {slot.start_time}-{slot.end_time} was {slot.status}",  # fallback
                                'author': author_info,
                                'details': {
                                    'time_slot': f"{slot.start_time}-{slot.end_time}",
                                    'status': slot.status,
                                    'description': slot.description or _('No description'),
                                    'service': slot.service.name if slot.service else None
                                },
                                'importance': 'high' if slot.status == 'no_show' else 'low'
                            })
                    
                    print(f"[DEBUG] Successfully created timeline entry for schedule {schedule.id}")
                except Exception as e:
                    print(f"[DEBUG] Error creating timeline entry for schedule {schedule.id}: {str(e)}")
                    continue
          # 5. SERVICE DEMANDS
        if activity_type in ['all', 'service']:
            service_demands = ServiceDemand.objects.filter(patient_id=patient_id)
            print(f"[DEBUG] Found {service_demands.count()} total service demands for patient {patient_id}")
            
            if cutoff_date:
                service_demands = service_demands.filter(created_at__gte=cutoff_date)
                print(f"[DEBUG] After date filtering: {service_demands.count()} service demands")
            
            for demand in service_demands.order_by('-created_at'):
                print(f"[DEBUG] Service demand: {demand.id}, created_at: {demand.created_at}")
                try:
                    # Get author information (who sent the demand)
                    author_info = None
                    if demand.sent_by:
                        author_info = {
                            'name': f"{demand.sent_by.firstname or ''} {demand.sent_by.lastname or ''}".strip(),
                            'role': demand.sent_by.role or 'Unknown',
                            'id': demand.sent_by.id
                        }
                      # Get manager information if available
                    manager_name = _("Unassigned")
                    if demand.managed_by:
                        manager_name = f"{demand.managed_by.firstname or ''} {demand.managed_by.lastname or ''}".strip()
                    
                    # Determine importance based on priority and status
                    importance = 'low'
                    if demand.priority in ['High', 'Urgent']:
                        importance = 'high'
                    elif demand.priority == 'Normal' or demand.status in ['Under Review', 'In Progress']:
                        importance = 'medium'
                    
                    timeline_entries.append({
                        'id': f"service_demand_{demand.id}",
                        'type': 'service',
                        'timestamp': demand.created_at.isoformat(),
                        'title': _("Service Request: {title}").format(title=demand.title),
                        'description': demand.description[:100] + "..." if len(demand.description) > 100 else demand.description,
                        'author': author_info,                        'details': {
                            'title': demand.title,
                            'description': demand.description,
                            'service': demand.service.name if demand.service else _('No service specified'),
                            'status': demand.status,
                            'priority': demand.priority,
                            'managed_by': manager_name,
                            'preferred_start_date': demand.preferred_start_date.isoformat() if demand.preferred_start_date else None,
                            'frequency': demand.frequency,
                            'contact_method': demand.contact_method,
                            'coordinator_notes': demand.coordinator_notes or _('No notes'),
                            'estimated_cost': str(demand.estimated_cost) if demand.estimated_cost else None
                        },
                        'importance': importance
                    })
                    
                    # Add status change entries if there are significant updates
                    if demand.reviewed_at and cutoff_date and demand.reviewed_at >= cutoff_date:
                        timeline_entries.append({
                            'id': f"service_demand_reviewed_{demand.id}",
                            'type': 'service',
                            'timestamp': demand.reviewed_at.isoformat(),
                            'title': _("Service Request Reviewed: {title}").format(title=demand.title),                            'description': _("Status updated to {status}").format(status=demand.status),
                            'author': {
                                'name': manager_name,
                                'role': _('Coordinator'),
                                'id': demand.managed_by.id if demand.managed_by else None
                            },
                            'details': {
                                'action': _('Status Update'),
                                'new_status': demand.status,
                                'coordinator_notes': demand.coordinator_notes or _('No notes')
                            },
                            'importance': 'medium'
                        })
                    
                    if demand.completed_at and cutoff_date and demand.completed_at >= cutoff_date:
                        timeline_entries.append({
                            'id': f"service_demand_completed_{demand.id}",
                            'type': 'service',
                            'timestamp': demand.completed_at.isoformat(),
                            'title': _("Service Request Completed: {title}").format(title=demand.title),
                            'description': _("Service request was completed successfully"),
                            'author': {
                                'name': manager_name,
                                'role': _('Coordinator'),
                                'id': demand.managed_by.id if demand.managed_by else None
                            },
                            'details': {
                                'action': _('Completion'),
                                'status': demand.status,
                                'service': demand.service.name if demand.service else _('Unknown service')
                            },
                            'importance': 'high'
                        })
                    
                    print(f"[DEBUG] Successfully created timeline entry for service demand {demand.id}")
                except Exception as e:
                    print(f"[DEBUG] Error creating timeline entry for service demand {demand.id}: {str(e)}")
                    continue
          # Sort all entries by timestamp (newest first)
        timeline_entries.sort(key=lambda x: x['timestamp'], reverse=True)
        print(f"[DEBUG] Total timeline entries before author filter: {len(timeline_entries)}")
        
        # Apply author filter if specified
        if author_filter != 'all':
            timeline_entries = [
                entry for entry in timeline_entries 
                if entry.get('author') and str(entry['author']['id']) == author_filter
            ]
            print(f"[DEBUG] Timeline entries after author filter '{author_filter}': {len(timeline_entries)}")
        
        print(f"[DEBUG] Final timeline entries: {len(timeline_entries)}")
        for entry in timeline_entries:
            print(f"[DEBUG] Entry: {entry['type']} - {entry['title']} - {entry['timestamp']}")
        
        return Response({
            'status': 'success',
            'timeline': timeline_entries,
            'patient': {
                'id': patient.id,
                'name': f"{patient.user.firstname or ''} {patient.user.lastname or ''}".strip() if patient.user else "Unknown Patient",
                'email': patient.user.email if patient.user else "No email"
            },
            'filters': {
                'type': activity_type,
                'days': days,
                'author': author_filter
            },            'summary': {
                'total_entries': len(timeline_entries),
                'date_range': _("Last {days} days").format(days=days) if days != 'all' else _("All time")
            }
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': _('Failed to fetch timeline: {error}').format(error=str(e))
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
