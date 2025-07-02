from CareLink.models import Invoice, InvoiceLine, TimeSlot, Service, Provider, Schedule
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

def get_service_price(timeslot):
    """Helper function to get the correct service price from a timeslot"""
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
    Generate an invoice for a patient for a given period.
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

        total = 0
        for ts in timeslots:
            service = ts.service or (ts.prescription.service if ts.prescription else None)
            if not service:
                logger.warning(f"No service found for timeslot {ts.id}, skipping")
                continue

            provider = get_provider_from_schedule(ts)
            price = get_service_price(ts)

            if price == 0:
                logger.warning(f"No price found for service {service.id} in timeslot {ts.id}")

            # Get the date from the schedule
            schedule = Schedule.objects.filter(time_slots=ts).first()
            if not schedule:
                logger.warning(f"No schedule found for timeslot {ts.id}, using period start date")
                date = period_start
            else:
                date = schedule.date

            # Calculate hours for display
            hours = calculate_hours(ts.start_time, ts.end_time)

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
            total += price
            logger.debug(f"Created invoice line for timeslot {ts.id}: {price}€ ({hours} hours at {service.price}€/hour)")

        invoice.amount = total
        invoice.save()

        logger.info(f"Generated invoice {invoice.id} with total amount {total}€")
        return invoice 