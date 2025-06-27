from rest_framework import serializers
from CareLink.models import Provider, Contract, User, Service
from django.contrib.auth import get_user_model

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for provider display"""
    full_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'firstname', 'lastname', 'email', 'full_name', 'address', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return f"{obj.firstname} {obj.lastname}".strip()

class ServiceBasicSerializer(serializers.ModelSerializer):
    """Basic service information"""
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price']
        read_only_fields = ['id']

class ContractSerializer(serializers.ModelSerializer):
    """Contract serializer with full details"""
    supervisor_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    monthly_salary = serializers.SerializerMethodField()
    
    # Explicitly define foreign key fields for proper handling
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False, allow_null=True)
    supervisor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Contract
        fields = [
            'id', 'contract_reference', 'type_contract', 'status',
            'start_date', 'end_date', 'salary', 'hour_quantity',
            'hourly_rate', 'weekly_hours', 'department', 'notes',
            'created_at', 'supervisor_name', 'user_name', 'service_name',
            'monthly_salary', 'user', 'service', 'supervisor'
        ]
        read_only_fields = ['id', 'created_at']
    
    def to_internal_value(self, data):
        """Convert empty strings to None for date fields before validation"""
        if isinstance(data, dict):
            # Handle empty strings for date fields
            if 'start_date' in data and data['start_date'] == '':
                data['start_date'] = None
            if 'end_date' in data and data['end_date'] == '':
                data['end_date'] = None
        return super().to_internal_value(data)
    
    def validate(self, data):
        """Custom validation to handle empty strings for date fields"""
        # Convert empty strings to None for date fields
        if 'start_date' in data and data['start_date'] == '':
            data['start_date'] = None
        if 'end_date' in data and data['end_date'] == '':
            data['end_date'] = None
            
        return data
    
    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.firstname} {obj.supervisor.lastname}".strip()
        return None
    
    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.firstname} {obj.user.lastname}".strip()
        return None
    
    def get_service_name(self, obj):
        return obj.service.name if obj.service else None
    
    def get_monthly_salary(self, obj):
        """Calculate monthly salary based on hourly rate and weekly hours"""
        if obj.hourly_rate and obj.weekly_hours:
            return float(obj.hourly_rate) * obj.weekly_hours * 4.33  # Average weeks per month
        return None

class ContractBasicSerializer(serializers.ModelSerializer):
    """Basic contract information for provider list"""
    service_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Contract
        fields = [
            'id', 'contract_reference', 'type_contract', 'status',
            'start_date', 'end_date', 'service_name'
        ]
        read_only_fields = ['id']
    
    def get_service_name(self, obj):
        return obj.service.name if obj.service else None

class ProviderSerializer(serializers.ModelSerializer):
    """Provider serializer with user and contract information"""
    user = UserBasicSerializer(read_only=True)
    service = ServiceBasicSerializer(read_only=True)
    contracts = ContractSerializer(source='user.contract_set', many=True, read_only=True)
    active_contract = serializers.SerializerMethodField()
    contracts_count = serializers.SerializerMethodField()
    phone_numbers = serializers.SerializerMethodField()
    
    class Meta:
        model = Provider
        fields = [
            'id', 'user', 'service', 'is_internal', 'contracts',
            'active_contract', 'contracts_count', 'phone_numbers'
        ]
        read_only_fields = ['id']
    
    def get_active_contract(self, obj):
        """Get the currently active contract for this provider"""
        if obj.user:
            active_contract = obj.user.contract_set.filter(status='active').first()
            if active_contract:
                return ContractBasicSerializer(active_contract).data
        return None
    
    def get_contracts_count(self, obj):
        """Get total number of contracts for this provider"""
        if obj.user:
            return obj.user.contract_set.count()
        return 0
    
    def get_phone_numbers(self, obj):
        """Get phone numbers for this provider"""
        if obj.user:
            phones = obj.user.phone_numbers.all()
            return [{'number': phone.phone_number, 'name': phone.name, 'is_primary': phone.is_primary} 
                   for phone in phones]
        return []

class ProviderListSerializer(serializers.ModelSerializer):
    """Simplified provider serializer for list view"""
    user = UserBasicSerializer(read_only=True)
    service_name = serializers.SerializerMethodField()
    active_contract_status = serializers.SerializerMethodField()
    active_contract_end_date = serializers.SerializerMethodField()
    active_contract_start_date = serializers.SerializerMethodField()
    active_contract_department = serializers.SerializerMethodField()
    contracts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Provider
        fields = [
            'id', 'user', 'service_name', 'is_internal', 
            'active_contract_status', 'active_contract_end_date', 'active_contract_start_date',
            'active_contract_department', 'contracts_count'
        ]
        read_only_fields = ['id']
    
    def get_service_name(self, obj):
        return obj.service.name if obj.service else None    
    def get_active_contract_status(self, obj):
        """Get status of active contract"""
        if obj.user:
            active_contract = obj.user.contract_set.filter(status='active').first()
            if active_contract:
                return active_contract.status
            # Check if there are any contracts at all
            if obj.user.contract_set.exists():
                latest_contract = obj.user.contract_set.order_by('-created_at').first()
                return latest_contract.status
            return 'no_contract'
        return 'no_user'
    def get_active_contract_end_date(self, obj):
        """Get end date of active contract"""
        if obj.user:
            active_contract = obj.user.contract_set.filter(status='active').first()
            return active_contract.end_date if active_contract else None
        return None
    
    def get_active_contract_start_date(self, obj):
        """Get start date of active contract"""
        if obj.user:
            active_contract = obj.user.contract_set.filter(status='active').first()
            return active_contract.start_date if active_contract else None
        return None
    
    def get_active_contract_department(self, obj):
        """Get department of active contract"""
        if obj.user:
            active_contract = obj.user.contract_set.filter(status='active').first()
            return active_contract.department if active_contract else None
        return None
    
    def get_contracts_count(self, obj):
        """Get total number of contracts"""
        if obj.user:
            return obj.user.contract_set.count()
        return 0

class ProviderStatsSerializer(serializers.Serializer):
    """Provider statistics serializer"""
    total_providers = serializers.IntegerField()
    active_contracts = serializers.IntegerField()
    expiring_contracts = serializers.IntegerField()
    providers_without_contracts = serializers.IntegerField()
    internal_providers = serializers.IntegerField()
    external_providers = serializers.IntegerField()
    contracts_by_type = serializers.DictField()
    contracts_by_status = serializers.DictField()
