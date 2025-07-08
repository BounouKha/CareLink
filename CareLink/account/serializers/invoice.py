from rest_framework import serializers
from CareLink.models import Invoice, InvoiceLine
from account.invoice_utils import calculate_hours
from decimal import Decimal

class InvoiceLineSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    provider_name = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    pricing_explanation = serializers.SerializerMethodField()
    covered_by_insurance = serializers.SerializerMethodField()
    hourly_rate = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceLine
        fields = [
            'id', 'service', 'service_name', 'provider', 'provider_name', 
            'date', 'start_time', 'end_time', 'price', 'status',
            'duration_hours', 'pricing_explanation', 'covered_by_insurance', 'hourly_rate'
        ]

    def get_provider_name(self, obj):
        if obj.provider and obj.provider.user:
            return f"{obj.provider.user.firstname} {obj.provider.user.lastname}"
        return "Unknown Provider"

    def get_duration_hours(self, obj):
        """Calculate duration in hours for this timeslot"""
        return calculate_hours(obj.start_time, obj.end_time)

    def get_hourly_rate(self, obj):
        """Calculate the effective hourly rate"""
        hours = self.get_duration_hours(obj)
        if hours > 0 and obj.price > 0:
            return round(float(obj.price) / hours, 2)
        return 0.00

    def get_pricing_explanation(self, obj):
        """Provide explanation of pricing based on service type and business rules"""
        if not obj.service:
            return "No service information available"
        
        service_id = obj.service.id
        hours = self.get_duration_hours(obj)
        
        if service_id in [1, 2]:  # Family Help/Housekeeping
            if obj.price == 0:
                return f"Service {service_id}: No charge applied"
            else:
                hourly_rate = self.get_hourly_rate(obj)
                return f"Service {service_id}: Patient pays {hours}h × €{hourly_rate}/h"
        
        elif service_id == 3:  # Nursing (INAMI)
            if obj.price == 0:
                return "Service 3: INAMI covers cost (prescription provided)"
            else:
                return "Service 3: Patient pays INAMI rate (no prescription)"
        
        else:
            return f"Service {service_id}: Standard pricing applied"

    def get_covered_by_insurance(self, obj):
        """Determine if this line item is covered by insurance"""
        if not obj.service:
            return False
        
        # Service 3 (Nursing) with €0.00 price means INAMI covers it
        if obj.service.id == 3 and obj.price == 0:
            return True
        
        return False

class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    total_hours = serializers.SerializerMethodField()
    lines_breakdown = serializers.SerializerMethodField()
    insurance_coverage_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'patient', 'patient_name', 'created_at', 'period_start', 'period_end', 
            'status', 'amount', 'lines', 'total_hours', 'lines_breakdown', 'insurance_coverage_summary'
        ]

    def get_patient_name(self, obj):
        """Get patient full name"""
        if obj.patient and obj.patient.user:
            return f"{obj.patient.user.firstname} {obj.patient.user.lastname}"
        return "Unknown Patient"

    def get_total_hours(self, obj):
        """Calculate total hours across all invoice lines"""
        total = 0
        for line in obj.lines.all():
            total += calculate_hours(line.start_time, line.end_time)
        return round(total, 2)

    def get_lines_breakdown(self, obj):
        """Provide a summary breakdown of invoice lines by service type"""
        breakdown = {
            'service_1_2': {'count': 0, 'total_amount': 0.0, 'total_hours': 0.0},
            'service_3': {'count': 0, 'total_amount': 0.0, 'total_hours': 0.0},
            'other': {'count': 0, 'total_amount': 0.0, 'total_hours': 0.0}
        }
        
        for line in obj.lines.all():
            hours = calculate_hours(line.start_time, line.end_time)
            
            if line.service and line.service.id in [1, 2]:
                breakdown['service_1_2']['count'] += 1
                breakdown['service_1_2']['total_amount'] += float(line.price)
                breakdown['service_1_2']['total_hours'] += hours
            elif line.service and line.service.id == 3:
                breakdown['service_3']['count'] += 1
                breakdown['service_3']['total_amount'] += float(line.price)
                breakdown['service_3']['total_hours'] += hours
            else:
                breakdown['other']['count'] += 1
                breakdown['other']['total_amount'] += float(line.price)
                breakdown['other']['total_hours'] += hours
        
        return breakdown

    def get_insurance_coverage_summary(self, obj):
        """Provide summary of insurance coverage for this invoice"""
        total_lines = obj.lines.count()
        covered_lines = 0
        covered_amount = Decimal('0.00')
        patient_amount = Decimal('0.00')
        
        for line in obj.lines.all():
            if line.service and line.service.id == 3 and line.price == 0:
                covered_lines += 1
                # For covered items, we could estimate the INAMI value
                # For now, we'll just track that it's covered
            else:
                patient_amount += line.price
        
        return {
            'total_lines': total_lines,
            'covered_by_insurance': covered_lines,
            'patient_pays': covered_lines < total_lines,
            'patient_amount': float(patient_amount),
            'coverage_percentage': round((covered_lines / total_lines) * 100, 1) if total_lines > 0 else 0
        } 