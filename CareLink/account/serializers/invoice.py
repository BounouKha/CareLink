from rest_framework import serializers
from CareLink.models import Invoice, InvoiceLine

class InvoiceLineSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    provider_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceLine
        fields = [
            'id', 'service', 'service_name', 'provider', 'provider_name', 'date', 'start_time', 'end_time', 'price', 'status'
        ]

    def get_provider_name(self, obj):
        if obj.provider and obj.provider.user:
            return f"{obj.provider.user.firstname} {obj.provider.user.lastname}"
        return None

class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    class Meta:
        model = Invoice
        fields = [
            'id', 'patient', 'created_at', 'period_start', 'period_end', 'status', 'amount', 'lines'
        ] 