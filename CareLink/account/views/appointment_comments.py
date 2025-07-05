from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.http import JsonResponse
import logging

# Import models properly
try:
    from CareLink.models import AppointmentComment, TimeSlot, Schedule, Patient, FamilyPatient
except ImportError:
    from schedule.models import TimeSlot, Schedule
    from account.models import Patient, FamilyPatient
    from CareLink.models import AppointmentComment

logger = logging.getLogger('carelink')

class AppointmentCommentAPIView(APIView):
    """
    API for patients and family members to add comments to appointments
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, timeslot_id=None):
        """Get comments for a specific appointment or all user's comments"""
        try:
            if timeslot_id:
                # Get comments for specific appointment
                comments = AppointmentComment.objects.filter(
                    timeslot_id=timeslot_id,
                    created_by=request.user
                )
                
                # Check if user can view this appointment
                try:
                    timeslot = TimeSlot.objects.get(id=timeslot_id)
                    if comments.exists():
                        can_comment, reason = comments.first().can_user_comment(request.user)
                        if not can_comment:
                            return Response({
                                "error": "You are not authorized to view comments for this appointment"
                            }, status=status.HTTP_403_FORBIDDEN)
                except TimeSlot.DoesNotExist:
                    return Response({
                        "error": "Appointment not found"
                    }, status=status.HTTP_404_NOT_FOUND)
                
                comments_data = []
                for comment in comments:
                    comments_data.append({
                        "id": comment.id,
                        "comment": comment.comment,
                        "created_at": comment.created_at.isoformat(),
                        "updated_at": comment.updated_at.isoformat(),
                        "is_edited": comment.is_edited,
                        "days_since_appointment": comment.days_since_appointment,
                        "can_still_comment": comment.can_still_comment
                    })
                
                return Response({
                    "comments": comments_data,
                    "timeslot_id": timeslot_id
                }, status=status.HTTP_200_OK)
            else:
                # Get all comments by this user
                comments = AppointmentComment.objects.filter(created_by=request.user)
                
                comments_data = []
                for comment in comments:
                    # Get appointment details
                    schedule = comment.timeslot.schedule_set.first()
                    appointment_info = {
                        "date": schedule.date.isoformat() if schedule else None,
                        "patient_name": f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule and schedule.patient and schedule.patient.user else "Unknown",
                        "provider_name": f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule and schedule.provider and schedule.provider.user else "Unknown"
                    }
                    
                    comments_data.append({
                        "id": comment.id,
                        "timeslot_id": comment.timeslot.id,
                        "comment": comment.comment,
                        "created_at": comment.created_at.isoformat(),
                        "updated_at": comment.updated_at.isoformat(),
                        "is_edited": comment.is_edited,
                        "days_since_appointment": comment.days_since_appointment,
                        "can_still_comment": comment.can_still_comment,
                        "appointment": appointment_info
                    })
                
                return Response({
                    "comments": comments_data
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error retrieving appointment comments: {str(e)}")
            return Response({
                "error": "Failed to retrieve comments"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, timeslot_id):
        """Add a comment to an appointment"""
        try:
            # Get the appointment
            try:
                timeslot = TimeSlot.objects.get(id=timeslot_id)
            except TimeSlot.DoesNotExist:
                return Response({
                    "error": "Appointment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if user can comment on this appointment
            temp_comment = AppointmentComment(timeslot=timeslot, created_by=request.user)
            can_comment, reason = temp_comment.can_user_comment(request.user)
            
            if not can_comment:
                logger.warning(f"Unauthorized comment attempt by {request.user.email} on timeslot {timeslot_id}: {reason}")
                return Response({
                    "error": f"Not authorized to comment: {reason}"
                }, status=status.HTTP_403_FORBIDDEN)

            # Check if comment already exists - if so, update it instead of creating new
            existing_comment = AppointmentComment.objects.filter(
                timeslot=timeslot,
                created_by=request.user
            ).first()
            
            if existing_comment:
                # Update existing comment instead of returning error
                old_comment = existing_comment.comment
                existing_comment.comment = comment_text
                existing_comment.is_edited = True
                existing_comment.save()

                # Log the action
                schedule = timeslot.schedule_set.first()
                patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule and schedule.patient and schedule.patient.user else "Unknown"
                
                logger.info(f"APPOINTMENT COMMENT UPDATED - User: {request.user.firstname} {request.user.lastname} ({request.user.email}) - Patient: {patient_name} - Timeslot: {timeslot_id}")
                
                # Console message as requested
                print(f"[APPOINTMENT COMMENT] {request.user.firstname} {request.user.lastname} updated comment on appointment {timeslot_id}: '{comment_text[:50]}{'...' if len(comment_text) > 50 else ''}'")

                return Response({
                    "message": "Comment updated successfully",
                    "comment": {
                        "id": existing_comment.id,
                        "comment": existing_comment.comment,
                        "created_at": existing_comment.created_at.isoformat(),
                        "updated_at": existing_comment.updated_at.isoformat(),
                        "is_edited": existing_comment.is_edited,
                        "days_since_appointment": existing_comment.days_since_appointment,
                        "can_still_comment": existing_comment.can_still_comment
                    }
                }, status=status.HTTP_200_OK)

            # Get comment content
            comment_text = request.data.get('comment', '').strip()
            if not comment_text:
                return Response({
                    "error": "Comment text is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            if len(comment_text) > 500:
                return Response({
                    "error": "Comment must be 500 characters or less"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create the comment
            comment = AppointmentComment(
                timeslot=timeslot,
                created_by=request.user,
                comment=comment_text
            )
            
            # Validate (includes 14-day check)
            try:
                comment.full_clean()
                comment.save()
            except ValidationError as e:
                return Response({
                    "error": str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Log the action
            schedule = timeslot.schedule_set.first()
            patient_name = f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule and schedule.patient and schedule.patient.user else "Unknown"
            
            logger.info(f"APPOINTMENT COMMENT ADDED - User: {request.user.firstname} {request.user.lastname} ({request.user.email}) - Patient: {patient_name} - Timeslot: {timeslot_id}")
            
            # Console message as requested
            print(f"[APPOINTMENT COMMENT] {request.user.firstname} {request.user.lastname} added comment to appointment {timeslot_id}: '{comment_text[:50]}{'...' if len(comment_text) > 50 else ''}'")

            return Response({
                "message": "Comment added successfully",
                "comment": {
                    "id": comment.id,
                    "comment": comment.comment,
                    "created_at": comment.created_at.isoformat(),
                    "days_since_appointment": comment.days_since_appointment,
                    "can_still_comment": comment.can_still_comment
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error adding appointment comment: {str(e)}")
            return Response({
                "error": "Failed to add comment"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, timeslot_id):
        """Update an existing comment"""
        try:
            # Get existing comment
            try:
                comment = AppointmentComment.objects.get(
                    timeslot_id=timeslot_id,
                    created_by=request.user
                )
            except AppointmentComment.DoesNotExist:
                return Response({
                    "error": "Comment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if still within 14-day window
            if not comment.can_still_comment:
                return Response({
                    "error": f"Comments can only be edited within 14 days of the appointment. This appointment was {comment.days_since_appointment} days ago."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get new comment text
            comment_text = request.data.get('comment', '').strip()
            if not comment_text:
                return Response({
                    "error": "Comment text is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            if len(comment_text) > 500:
                return Response({
                    "error": "Comment must be 500 characters or less"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update comment
            old_comment = comment.comment
            comment.comment = comment_text
            comment.is_edited = True
            comment.save()

            # Log the action
            logger.info(f"APPOINTMENT COMMENT UPDATED - User: {request.user.firstname} {request.user.lastname} ({request.user.email}) - Timeslot: {timeslot_id}")
            
            # Console message as requested
            print(f"[APPOINTMENT COMMENT] {request.user.firstname} {request.user.lastname} updated comment on appointment {timeslot_id}")

            return Response({
                "message": "Comment updated successfully",
                "comment": {
                    "id": comment.id,
                    "comment": comment.comment,
                    "updated_at": comment.updated_at.isoformat(),
                    "is_edited": comment.is_edited
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error updating appointment comment: {str(e)}")
            return Response({
                "error": "Failed to update comment"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, timeslot_id):
        """Delete a comment"""
        try:
            # Get existing comment
            try:
                comment = AppointmentComment.objects.get(
                    timeslot_id=timeslot_id,
                    created_by=request.user
                )
            except AppointmentComment.DoesNotExist:
                return Response({
                    "error": "Comment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if still within 14-day window
            if not comment.can_still_comment:
                return Response({
                    "error": f"Comments can only be deleted within 14 days of the appointment. This appointment was {comment.days_since_appointment} days ago."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Delete comment
            comment.delete()

            # Log the action
            logger.info(f"APPOINTMENT COMMENT DELETED - User: {request.user.firstname} {request.user.lastname} ({request.user.email}) - Timeslot: {timeslot_id}")
            
            # Console message as requested
            print(f"[APPOINTMENT COMMENT] {request.user.firstname} {request.user.lastname} deleted comment on appointment {timeslot_id}")

            return Response({
                "message": "Comment deleted successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error deleting appointment comment: {str(e)}")
            return Response({
                "error": "Failed to delete comment"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckCommentPermissionAPIView(APIView):
    """
    API to check if user can comment on a specific appointment
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, timeslot_id):
        """Check if user can comment on this appointment"""
        try:
            # Get the appointment
            try:
                timeslot = TimeSlot.objects.get(id=timeslot_id)
            except TimeSlot.DoesNotExist:
                return Response({
                    "error": "Appointment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Get appointment date
            schedule = timeslot.schedule_set.first()
            if not schedule:
                return Response({
                    "can_comment": False,
                    "reason": "No schedule found for this appointment",
                    "has_happened": False
                }, status=status.HTTP_200_OK)
            
            appointment_date = schedule.date
            current_date = timezone.now().date()
            
            # Check if appointment has happened yet
            has_happened = appointment_date < current_date
            
            if not has_happened:
                return Response({
                    "can_comment": False,
                    "reason": "Comments can only be added after the appointment has taken place",
                    "appointment_date": appointment_date.isoformat(),
                    "has_happened": False,
                    "days_since_appointment": 0
                }, status=status.HTTP_200_OK)
            
            days_since_appointment = (current_date - appointment_date).days
            
            # Check 14-day window
            within_14_days = days_since_appointment <= 14
            
            if not within_14_days:
                return Response({
                    "can_comment": False,
                    "reason": f"Comments can only be added within 14 days of the appointment. This appointment was {days_since_appointment} days ago.",
                    "days_since_appointment": days_since_appointment,
                    "has_happened": True,
                    "within_14_day_window": False
                }, status=status.HTTP_200_OK)
            
            # Check if user is patient or family member of this appointment
            user = request.user
            patient = schedule.patient  # Get patient from schedule, not timeslot
            
            # Check if user is the patient
            if patient.user == user:
                user_role = 'patient'
                can_comment = True
            # Check if user is family member of the patient
            elif hasattr(user, 'family_patients'):
                # Check if user is a family member of this patient
                if user.family_patients.filter(patient=patient).exists():
                    user_role = 'family'
                    can_comment = True
                else:
                    can_comment = False
                    user_role = None
            else:
                can_comment = False
                user_role = None
            
            if not can_comment:
                return Response({
                    "can_comment": False,
                    "reason": "You can only comment on your own appointments",
                    "days_since_appointment": days_since_appointment,
                    "has_happened": True,
                    "within_14_day_window": True
                }, status=status.HTTP_200_OK)
            
            # Check if comment already exists
            existing_comment = AppointmentComment.objects.filter(
                timeslot=timeslot,
                created_by=request.user
            ).first()

            return Response({
                "can_comment": True,
                "reason": "Can comment on this appointment",
                "has_existing_comment": existing_comment is not None,
                "existing_comment": {
                    "id": existing_comment.id,
                    "comment": existing_comment.comment,
                    "created_at": existing_comment.created_at.isoformat(),
                    "is_edited": existing_comment.is_edited
                } if existing_comment else None,
                "days_since_appointment": days_since_appointment,
                "has_happened": True,
                "within_14_day_window": True,
                "user_role": user_role
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error checking comment permission: {str(e)}")
            return Response({
                "error": "Failed to check permissions"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CoordinatorViewCommentsAPIView(APIView):
    """
    API for coordinators to view all comments on a specific appointment
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, timeslot_id):
        """Get all comments for a specific appointment (coordinator view)"""
        try:
            # Check if user is coordinator
            if not hasattr(request.user, 'role') or request.user.role not in ['Coordinator', 'Administrative']:
                return Response({
                    "error": "Only coordinators can view all appointment comments"
                }, status=status.HTTP_403_FORBIDDEN)

            # Get the appointment
            try:
                timeslot = TimeSlot.objects.get(id=timeslot_id)
            except TimeSlot.DoesNotExist:
                return Response({
                    "error": "Appointment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Get ALL comments for this appointment (not just by current user)
            comments = AppointmentComment.objects.filter(timeslot_id=timeslot_id).order_by('created_at')
            
            comments_data = []
            for comment in comments:
                # Get user info for who created the comment
                creator_name = f"{comment.created_by.firstname} {comment.created_by.lastname}" if comment.created_by else "Unknown User"
                
                comments_data.append({
                    "id": comment.id,
                    "comment": comment.comment,
                    "created_at": comment.created_at.isoformat(),
                    "updated_at": comment.updated_at.isoformat(),
                    "is_edited": comment.is_edited,
                    "created_by_name": creator_name,
                    "created_by_role": comment.created_by.role if comment.created_by else "Unknown",
                    "days_since_appointment": comment.days_since_appointment,
                    "can_still_comment": comment.can_still_comment
                })

            # Get appointment details for context
            schedule = timeslot.schedule_set.first()
            appointment_info = {
                "patient_name": f"{schedule.patient.user.firstname} {schedule.patient.user.lastname}" if schedule and schedule.patient and schedule.patient.user else "Unknown",
                "appointment_date": schedule.date.isoformat() if schedule else None,
                "provider_name": f"{schedule.provider.user.firstname} {schedule.provider.user.lastname}" if schedule and schedule.provider and schedule.provider.user else "Unknown"
            }

            return Response({
                "comments": comments_data,
                "timeslot_id": timeslot_id,
                "appointment_info": appointment_info,
                "total_comments": len(comments_data)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving comments for coordinator: {str(e)}")
            return Response({
                "error": "Failed to retrieve comments"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

