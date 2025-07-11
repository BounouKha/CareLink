from CareLink.models import Invoice, InvoiceLine, TimeSlot, Service, Provider, Schedule, PatientServicePrice
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

def calculate_hours(start_time, end_time):
    """Helper function to calculate hours between two times"""
    if not start_time or not end_time:
        return 0
        
    # Convert time objects to datetime for calculation
    today = timezone.now().date()
    start_dt = datetime.combine(today, start_time)
    end_dt = datetime.combine(today, end_time)
    
    # Calculate duration
    duration = end_dt - start_dt
    hours = duration.total_seconds() / 3600
    
    return round(hours, 2)

def get_patient_hourly_rate(patient, service):
    """
    Get the hourly rate for a patient/service combination (Services 1 & 2 only)
    Returns just the hourly rate as Decimal
    """
    if service.id in [1, 2]:  # Family Help/Housekeeping services
        try:
            patient_price = PatientServicePrice.objects.get(patient=patient, service=service)
            logger.debug(f"Using custom hourly rate for patient {patient.id}, service {service.id}: €{patient_price.custom_price}")
            return patient_price.custom_price
        except PatientServicePrice.DoesNotExist:
            logger.debug(f"Using default service price for service {service.id}: €{service.price}")
            return service.price
    else:
        return service.price

def get_patient_service_price(patient, service, timeslot):
    """
    Get the correct price for a timeslot based on new business logic:
    - Service 1 & 2: Use PatientServicePrice or service default, patient always pays
    - Service 3: €0.00 if prescription exists, otherwise INAMI rate
    """
    hours = calculate_hours(timeslot.start_time, timeslot.end_time)
    
    if service.id in [1, 2]:  # Family Help/Housekeeping services
        logger.debug(f"Processing Service {service.id} ({service.name}) for patient {patient.id}")
        
        # Get hourly rate
        base_price = get_patient_hourly_rate(patient, service)
        
        # Calculate total price based on hours
        total_price = base_price * Decimal(str(hours))
        logger.debug(f"Service {service.id}: {hours}h × €{base_price} = €{total_price}")
        
        return {
            'price': total_price,
            'hourly_rate': base_price,
            'hours': hours,
            'reasoning': f"Service {service.id}: Patient pays {hours}h × €{base_price}/h",
            'covered_by_insurance': False
        }
        
    elif service.id == 3:  # Nursing service (INAMI)
        logger.debug(f"Processing Service 3 (Nursing/INAMI) for patient {patient.id}")
        
        # Check if this specific timeslot has a prescription
        has_prescription = (timeslot.prescription is not None and 
                          timeslot.prescription.service == service and
                          timeslot.prescription.status == 'accepted')
        
        if has_prescription:
            logger.debug(f"Patient {patient.id} has prescription for service {service.id} - INAMI covers cost")
            return {
                'price': Decimal('0.00'),
                'hourly_rate': Decimal('0.00'),
                'hours': hours,
                'reasoning': f"Service 3: INAMI covers 100% - patient has prescription",
                'covered_by_insurance': True
            }
        else:
            # No prescription - check patient's BIM status for co-payment
            logger.debug(f"Patient {patient.id} has NO prescription for service {service.id}")
            
            # Get base INAMI rate
            base_inami_rate = Decimal('0.00')
            if hasattr(timeslot, 'inami_data') and timeslot.inami_data:
                # Extract hourly rate from INAMI data
                if 'hourly_rate' in timeslot.inami_data:
                    base_inami_rate = Decimal(str(timeslot.inami_data['hourly_rate']))
                elif 'price' in timeslot.inami_data:
                    base_inami_rate = Decimal(str(timeslot.inami_data['price'])) / Decimal(str(hours)) if hours > 0 else Decimal('0.00')
                logger.debug(f"Using INAMI hourly rate: €{base_inami_rate}")
            else:
                # Fallback to service default price
                base_inami_rate = service.price
                logger.debug(f"No INAMI data found, using service default rate: €{base_inami_rate}")
            
            # Calculate total base cost
            total_base_cost = base_inami_rate * Decimal(str(hours))
            
            # Check if patient has BIM status (reduced co-payment)
            # BIM = "Bénéficiaires de l'Intervention Majorée" (Belgian social tariff)
            has_bim_status = getattr(patient, 'social_price', False)
            
            if has_bim_status:
                # BIM patients pay fixed minimal co-payment according to Belgian INAMI system
                # For most nursing services: €0.00 or €0.31 per session
                if total_base_cost <= Decimal('10.00'):
                    # Small/basic services are free for BIM patients
                    patient_payment = Decimal('0.00')
                    coverage_percentage = 100
                    logger.debug(f"Patient has BIM status - free care (total cost ≤ €10)")
                    reasoning = f"Service 3: BIM status - free care (total €{total_base_cost:.2f})"
                else:
                    # Larger services: fixed €0.31 co-payment (Belgian standard)
                    patient_payment = Decimal('0.31') * Decimal(str(hours))  # €0.31 per hour
                    coverage_percentage = int(((total_base_cost - patient_payment) / total_base_cost * 100)) if total_base_cost > 0 else 100
                    logger.debug(f"Patient has BIM status - pays fixed €0.31/hour: €{patient_payment}")
                    reasoning = f"Service 3: BIM status - fixed €0.31/hour co-payment (total €{total_base_cost:.2f})"
            else:
                # Regular patients pay 25% co-payment (Belgian "ticket modérateur" standard)
                co_payment_rate = Decimal('0.25')  # 25% - Belgian standard
                patient_payment = total_base_cost * co_payment_rate
                coverage_percentage = 75
                logger.debug(f"Patient pays Belgian standard 25% co-payment: €{patient_payment}")
                reasoning = f"Service 3: Belgian standard 25% co-payment (€{patient_payment:.2f} of €{total_base_cost:.2f})"
            
            return {
                'price': patient_payment,
                'hourly_rate': patient_payment / Decimal(str(hours)) if hours > 0 else Decimal('0.00'),
                'hours': hours,
                'reasoning': reasoning,
                'covered_by_insurance': True,
                'coverage_percentage': coverage_percentage,
                'total_cost': total_base_cost,
                'insurance_covers': total_base_cost - patient_payment
            }
    
    else:
        # Other services - use default pricing
        logger.debug(f"Processing other service {service.id} ({service.name})")
        base_price = service.price
        total_price = base_price * Decimal(str(hours))
        
        return {
            'price': total_price,
            'hourly_rate': base_price,
            'hours': hours,
            'reasoning': f"Service {service.id}: Default pricing {hours}h × €{base_price}/h",
            'covered_by_insurance': False
        }

def get_service_price(timeslot):
    """
    Legacy function - deprecated in favor of get_patient_service_price
    Kept for backward compatibility
    """
    logger.warning("Using deprecated get_service_price function. Use get_patient_service_price instead.")
    
    base_price = Decimal('0')
    if timeslot.service and timeslot.service.price:
        base_price = timeslot.service.price
    elif timeslot.prescription and timeslot.prescription.service:
        base_price = timeslot.prescription.service.price
    
    # Calculate hours
    hours = calculate_hours(timeslot.start_time, timeslot.end_time)
    
    # Convert hours to Decimal and return price multiplied by hours
    return base_price * Decimal(str(hours))

def get_provider_from_schedule(timeslot):
    """Helper function to get the provider from the schedule containing this timeslot"""
    schedule = Schedule.objects.filter(time_slots=timeslot).first()
    return schedule.provider if schedule else None

def generate_invoice_for_patient_period(patient, period_start, period_end, timeslots=None):
    """
    Generate an invoice for a patient for a given period using new business logic.
    If timeslots is None, auto-select all completed/confirmed timeslots for the patient in the period.
    Returns the created Invoice instance.
    """
    logger.info(f"Generating invoice for patient {patient.id} for period {period_start} to {period_end}")

    if timeslots is None:
        # Get all schedules for this patient in the period
        schedules = Schedule.objects.filter(
            patient=patient,
            date__gte=period_start,
            date__lte=period_end
        )
        
        # Get all timeslots from these schedules that are completed or confirmed
        timeslots = TimeSlot.objects.filter(
            schedule__in=schedules,
            status__in=["completed", "confirmed"]
        ).distinct()

        logger.debug(f"Found {timeslots.count()} completed/confirmed timeslots for patient")

    with transaction.atomic():
        # Check if invoice already exists
        existing_invoice = Invoice.objects.filter(
            patient=patient,
            period_start=period_start,
            period_end=period_end
        ).first()

        if existing_invoice:
            logger.warning(f"Invoice already exists for patient {patient.id} in period {period_start} to {period_end}")
            return existing_invoice

        invoice = Invoice.objects.create(
            patient=patient,
            period_start=period_start,
            period_end=period_end,
            status="In Progress",
            amount=0  # Will be updated after lines are created
        )

        total_amount = Decimal('0.00')
        lines_created = 0
        
        for ts in timeslots:
            service = ts.service or (ts.prescription.service if ts.prescription else None)
            if not service:
                logger.warning(f"No service found for timeslot {ts.id}, skipping")
                continue

            provider = get_provider_from_schedule(ts)

            # Use new pricing logic
            pricing_info = get_patient_service_price(patient, service, ts)
            price = pricing_info['price']

            # Get the date from the schedule
            schedule = Schedule.objects.filter(time_slots=ts).first()
            if not schedule:
                logger.warning(f"No schedule found for timeslot {ts.id}, using period start date")
                date = period_start
            else:
                date = schedule.date

            # Create invoice line with detailed information
            line = InvoiceLine.objects.create(
                invoice=invoice,
                timeslot=ts,
                service=service,
                provider=provider,
                date=date,
                start_time=ts.start_time,
                end_time=ts.end_time,
                price=price,
                status=ts.status
            )
            
            total_amount += price
            lines_created += 1

            logger.debug(f"Created invoice line for timeslot {ts.id}: €{price} - {pricing_info['reasoning']}")

        invoice.amount = total_amount
        invoice.save()

        logger.info(f"Generated invoice {invoice.id} with {lines_created} lines, total amount €{total_amount}")
        logger.info(f"Invoice breakdown: Services 1&2 (patient pays), Service 3 (€0.00 if prescription, INAMI rate if no prescription)")
        
        return invoice 