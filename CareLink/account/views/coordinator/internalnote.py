from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from CareLink.models import InternalNote, Patient, Service, Provider, Schedule
from django.core.paginator import Paginator


class InternalNoteView(APIView):
    """
    API View for managing internal notes.
    Only authorized staff can access internal notes.
    Providers can only view notes for patients they have/had appointments with.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        """Get internal notes for a specific patient"""
        try:
            # Get the patient
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found."}, status=404)

        # Check user permissions
        if not self._can_user_access_patient_internal_notes(request.user, patient):
            return Response({"error": "Permission denied. You cannot access internal notes for this patient."}, status=403)

        # Get internal notes for this patient
        internal_notes = InternalNote.objects.filter(patient=patient).order_by('-created_at')
        
        # Prepare the response data
        notes_data = []
        for note in internal_notes:
            note_data = {
                "id": note.id,
                "note": note.note,
                "created_at": note.created_at,
                "updated_at": note.updated_at,
                "is_critical": note.is_critical,
                "service": note.service.name if note.service else None,
                "service_id": note.service.id if note.service else None,
                "created_by": {
                    "id": note.created_by.id if note.created_by else None,
                    "name": f"{note.created_by.firstname} {note.created_by.lastname}" if note.created_by else "System",
                    "role": note.created_by.role if note.created_by else None
                }
            }
            notes_data.append(note_data)

        return Response({
            "patient_id": patient_id,
            "patient_name": f"{patient.user.firstname} {patient.user.lastname}" if patient.user else "Unknown",
            "notes": notes_data,
            "total_notes": len(notes_data)
        }, status=200)

    def post(self, request, patient_id):
        """Create a new internal note for a patient"""
        # Check if user can create internal notes
        if not self._can_user_create_internal_notes(request.user):
            return Response({"error": "Permission denied. You cannot create internal notes."}, status=403)

        try:
            # Get the patient
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found."}, status=404)

        # Get data from request
        note = request.data.get("note")
        service_id = request.data.get("service_id")
        is_critical = request.data.get("is_critical", False)

        if not note or not note.strip():
            return Response({"error": "Note content is required."}, status=400)

        # Get service if provided
        service = None
        if service_id:
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response({"error": "Service not found."}, status=400)

        # Create the internal note
        internal_note = InternalNote.objects.create(
            patient=patient,
            created_by=request.user,
            note=note.strip(),
            service=service,
            is_critical=is_critical
        )

        # Return the created note data
        response_data = {
            "id": internal_note.id,
            "note": internal_note.note,
            "created_at": internal_note.created_at,
            "updated_at": internal_note.updated_at,
            "is_critical": internal_note.is_critical,
            "service": internal_note.service.name if internal_note.service else None,
            "service_id": internal_note.service.id if internal_note.service else None,
            "created_by": {
                "id": internal_note.created_by.id,
                "name": f"{internal_note.created_by.firstname} {internal_note.created_by.lastname}",
                "role": internal_note.created_by.role
            }
        }

        return Response(response_data, status=201)

    def put(self, request, patient_id):
        """Update an existing internal note"""
        # Check if user can modify internal notes
        if not self._can_user_create_internal_notes(request.user):
            return Response({"error": "Permission denied. You cannot modify internal notes."}, status=403)

        note_id = request.data.get("note_id")
        if not note_id:
            return Response({"error": "Note ID is required for updates."}, status=400)

        try:
            internal_note = InternalNote.objects.get(id=note_id, patient_id=patient_id)
        except InternalNote.DoesNotExist:
            return Response({"error": "Internal note not found."}, status=404)

        # Update fields if provided
        note_content = request.data.get("note")
        if note_content is not None:
            if not note_content.strip():
                return Response({"error": "Note content cannot be empty."}, status=400)
            internal_note.note = note_content.strip()

        service_id = request.data.get("service_id")
        if service_id is not None:
            if service_id:
                try:
                    service = Service.objects.get(id=service_id)
                    internal_note.service = service
                except Service.DoesNotExist:
                    return Response({"error": "Service not found."}, status=400)
            else:
                internal_note.service = None

        is_critical = request.data.get("is_critical")
        if is_critical is not None:
            internal_note.is_critical = is_critical

        internal_note.save()

        # Return updated note data
        response_data = {
            "id": internal_note.id,
            "note": internal_note.note,
            "created_at": internal_note.created_at,
            "updated_at": internal_note.updated_at,
            "is_critical": internal_note.is_critical,
            "service": internal_note.service.name if internal_note.service else None,
            "service_id": internal_note.service.id if internal_note.service else None,
            "created_by": {
                "id": internal_note.created_by.id if internal_note.created_by else None,
                "name": f"{internal_note.created_by.firstname} {internal_note.created_by.lastname}" if internal_note.created_by else "System",
                "role": internal_note.created_by.role if internal_note.created_by else None
            }
        }

        return Response(response_data, status=200)

    def delete(self, request, patient_id):
        """Delete an internal note"""
        # Check if user can modify internal notes
        if not self._can_user_create_internal_notes(request.user):
            return Response({"error": "Permission denied. You cannot delete internal notes."}, status=403)

        note_id = request.data.get("note_id")
        if not note_id:
            return Response({"error": "Note ID is required for deletion."}, status=400)

        try:
            internal_note = InternalNote.objects.get(id=note_id, patient_id=patient_id)
        except InternalNote.DoesNotExist:
            return Response({"error": "Internal note not found."}, status=404)

        internal_note.delete()
        return Response({"message": "Internal note deleted successfully."}, status=200)

    def _can_user_access_patient_internal_notes(self, user, patient):
        """
        Check if a user can access internal notes for a specific patient
        """
        if not user or not user.is_authenticated:
            return False

        user_role = user.role

        # No access for patients and family members
        if user_role in ['Patient', 'Family Patient']:
            return False

        # Full access for coordinators, administrative, social assistants, administrators
        if user_role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']:
            return True

        # Limited access for providers - only for patients they have/had appointments with
        if user_role == 'Provider':
            try:
                provider = Provider.objects.get(user=user)
                # Check if provider has any past or present appointments with this patient
                has_appointments = Schedule.objects.filter(
                    provider=provider,
                    patient=patient
                ).exists()
                return has_appointments
            except Provider.DoesNotExist:
                return False

        return False

    def _can_user_create_internal_notes(self, user):
        """
        Check if a user can create/modify internal notes
        """
        if not user or not user.is_authenticated:
            return False

        # Only coordinators, administrative, social assistants, and administrators can create internal notes
        return user.role in ['Coordinator', 'Administrative', 'Social Assistant', 'Administrator']
