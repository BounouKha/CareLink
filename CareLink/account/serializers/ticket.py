from rest_framework import serializers
from CareLink.models import EnhancedTicket, TicketComment, TicketStatusHistory, User


class TicketCommentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_role = serializers.SerializerMethodField()
    can_view = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'comment', 'created_by', 'created_by_name', 'created_by_role', 'created_at', 'is_internal', 'can_view']
        read_only_fields = ['created_at', 'created_by_name', 'created_by_role', 'can_view']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.firstname} {obj.created_by.lastname}"
        return "System"
    
    def get_created_by_role(self, obj):
        if obj.created_by:
            return obj.created_by.role
        return None
    
    def get_can_view(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_user_view(request.user)
        return False


class TicketStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketStatusHistory
        fields = ['id', 'ticket', 'previous_status', 'new_status', 'changed_by', 'changed_by_name', 'changed_at', 'notes']
        read_only_fields = ['changed_at', 'changed_by_name']
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return f"{obj.changed_by.firstname} {obj.changed_by.lastname}"
        return "System"


class EnhancedTicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_role = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    days_since_created = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(write_only=True, required=False, help_text="User ID to create ticket for (admin only)")
    
    class Meta:
        model = EnhancedTicket
        fields = [
            'id', 'title', 'description', 'category', 'priority', 'status',
            'assigned_team', 'assigned_to', 'assigned_to_name', 'created_by', 'created_by_name', 'created_by_role',
            'created_at', 'updated_at', 'resolved_at', 'cancelled_at',
            'is_urgent', 'internal_notes', 'days_since_created', 'is_overdue',
            'can_access', 'comments_count', 'user_id'
        ]
        read_only_fields = ['created_at', 'updated_at', 'resolved_at', 'cancelled_at', 
                           'created_by_name', 'created_by_role', 'assigned_to_name', 'days_since_created', 
                           'is_overdue', 'can_access', 'comments_count']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.firstname} {obj.created_by.lastname}"
        return "No User"
    
    def get_created_by_role(self, obj):
        if obj.created_by:
            return obj.created_by.role
        return None
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.firstname} {obj.assigned_to.lastname}"
        return "Unassigned"
    
    def get_days_since_created(self, obj):
        return obj.days_since_created
    
    def get_is_overdue(self, obj):
        return obj.is_overdue
    
    def get_can_access(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_user_access(request.user)
        return False
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def create(self, validated_data):
        request = self.context.get('request')
        user_id = validated_data.pop('user_id', None)
        
        # Check if user is admin and trying to create ticket for another user
        if user_id and request and request.user:
            # Only allow superusers to create tickets for other users
            if not request.user.is_superuser:
                raise serializers.ValidationError("Only superusers can create tickets for other users")
            
            try:
                target_user = User.objects.get(id=user_id)
                validated_data['created_by'] = target_user
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User with ID {user_id} does not exist")
        elif request and request.user:
            # Regular ticket creation - use current user
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class EnhancedTicketDetailSerializer(EnhancedTicketSerializer):
    comments = TicketCommentSerializer(many=True, read_only=True)
    status_history = TicketStatusHistorySerializer(many=True, read_only=True)
    
    class Meta(EnhancedTicketSerializer.Meta):
        fields = EnhancedTicketSerializer.Meta.fields + ['comments', 'status_history']


class CreateTicketCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketComment
        fields = ['ticket', 'comment', 'is_internal']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class UpdateTicketStatusSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = EnhancedTicket
        fields = ['status', 'notes']
    
    def update(self, instance, validated_data):
        notes = validated_data.pop('notes', '')
        previous_status = instance.status
        
        # Update the ticket status
        instance = super().update(instance, validated_data)
        
        # Create status history entry
        request = self.context.get('request')
        TicketStatusHistory.objects.create(
            ticket=instance,
            previous_status=previous_status,
            new_status=validated_data['status'],
            changed_by=request.user if request else None,
            notes=notes
        )
        
        return instance


class TicketFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EnhancedTicket.STATUS_CHOICES, required=False)
    priority = serializers.ChoiceField(choices=EnhancedTicket.PRIORITY_CHOICES, required=False)
    assigned_team = serializers.ChoiceField(choices=EnhancedTicket.TEAM_CHOICES, required=False)
    category = serializers.ChoiceField(choices=EnhancedTicket.CATEGORY_CHOICES, required=False)
    my_tickets = serializers.BooleanField(required=False, default=False)
    is_overdue = serializers.BooleanField(required=False, default=False)
    search = serializers.CharField(required=False, allow_blank=True) 