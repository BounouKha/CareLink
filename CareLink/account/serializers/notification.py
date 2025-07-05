from rest_framework import serializers
from CareLink.models import Notification, ScheduleChangeRequest, NotificationPreference, User, Schedule, EnhancedTicket

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority',
            'is_read', 'read_at', 'created_at', 'updated_at',
            'sender_name', 'sender_role', 'time_ago', 'extra_data'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sender_name', 'sender_role', 'time_ago']
    
    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.firstname} {obj.sender.lastname}".strip()
        return "System"
    
    def get_sender_role(self, obj):
        if obj.sender:
            return obj.sender.role
        return "System"
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")


class ScheduleChangeRequestSerializer(serializers.ModelSerializer):
    """Serializer for schedule change requests"""
    requester_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    provider_name = serializers.SerializerMethodField()
    current_appointment_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduleChangeRequest
        fields = [
            'id', 'request_type', 'reason', 'requester_notes', 'coordinator_notes',
            'status', 'current_date', 'current_start_time', 'current_end_time',
            'requested_date', 'requested_start_time', 'requested_end_time',
            'created_at', 'updated_at', 'processed_at',
            'requester_name', 'patient_name', 'provider_name', 'current_appointment_info'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'processed_at',
            'requester_name', 'patient_name', 'provider_name', 'current_appointment_info'
        ]
    
    def get_requester_name(self, obj):
        if obj.requester:
            return f"{obj.requester.firstname} {obj.requester.lastname}".strip()
        return "Unknown"
    
    def get_patient_name(self, obj):
        if obj.schedule and obj.schedule.patient and obj.schedule.patient.user:
            user = obj.schedule.patient.user
            return f"{user.firstname} {user.lastname}".strip()
        return "Unknown Patient"
    
    def get_provider_name(self, obj):
        if obj.schedule and obj.schedule.provider and obj.schedule.provider.user:
            user = obj.schedule.provider.user
            return f"{user.firstname} {user.lastname}".strip()
        return "Unknown Provider"
    
    def get_current_appointment_info(self, obj):
        return {
            'date': obj.current_date,
            'start_time': obj.current_start_time,
            'end_time': obj.current_end_time,
            'duration_minutes': self._calculate_duration(obj.current_start_time, obj.current_end_time)
        }
    
    def _calculate_duration(self, start_time, end_time):
        if start_time and end_time:
            from datetime import datetime, timedelta
            start = datetime.combine(datetime.today(), start_time)
            end = datetime.combine(datetime.today(), end_time)
            duration = end - start
            return int(duration.total_seconds() / 60)
        return 0


class CreateScheduleChangeRequestSerializer(serializers.ModelSerializer):
    """Serializer for creating schedule change requests"""
    
    class Meta:
        model = ScheduleChangeRequest
        fields = [
            'schedule', 'request_type', 'reason', 'requester_notes',
            'requested_date', 'requested_start_time', 'requested_end_time'
        ]
    
    def validate(self, data):
        schedule = data.get('schedule')
        request_type = data.get('request_type')
        
        # Validate that schedule exists and user has permission
        if not schedule:
            raise serializers.ValidationError("Schedule is required")
        
        # For reschedule requests, require new date/time
        if request_type in ['reschedule', 'modify_time']:
            if not data.get('requested_date') and request_type == 'reschedule':
                raise serializers.ValidationError("Requested date is required for reschedule requests")
            if not data.get('requested_start_time') or not data.get('requested_end_time'):
                raise serializers.ValidationError("Requested start and end times are required")
        
        return data
    
    def create(self, validated_data):
        # Get current appointment details from schedule
        schedule = validated_data['schedule']
        
        # Get the first timeslot for current appointment details
        timeslot = schedule.time_slots.first()
        if timeslot:
            validated_data['current_start_time'] = timeslot.start_time
            validated_data['current_end_time'] = timeslot.end_time
        
        validated_data['current_date'] = schedule.date
        validated_data['requester'] = self.context['request'].user
        
        return super().create(validated_data)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'email_enabled', 'email_schedule_changes', 'email_new_tickets', 'email_comments',
            'app_enabled', 'app_schedule_changes', 'app_new_tickets', 'app_comments',
            'digest_frequency', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    unread_by_type = serializers.DictField()
    recent_notifications = NotificationSerializer(many=True) 