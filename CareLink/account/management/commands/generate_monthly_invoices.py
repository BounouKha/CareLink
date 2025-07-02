from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, date
from django.contrib.auth.models import User
from CareLink.models import Invoice, TimeSlot, Schedule, Patient
from account.invoice_utils import generate_invoice_for_patient_period
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate monthly invoices for all patients with completed/confirmed timeslots'

    def add_arguments(self, parser):
        # Optional arguments for month and year
        parser.add_argument(
            '--month',
            type=int,
            help='Month to generate invoices for (1-12)',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Year to generate invoices for',
        )

    def handle(self, *args, **options):
        # Get target month and year
        today = timezone.now().date()
        target_year = options['year'] or today.year
        target_month = options['month'] or today.month

        # Calculate period start and end dates
        if target_month == 12:
            next_month_year = target_year + 1
            next_month = 1
        else:
            next_month_year = target_year
            next_month = target_month + 1

        period_start = date(target_year, target_month, 1)
        period_end = date(next_month_year, next_month, 1)

        self.stdout.write(f"Generating invoices for period: {period_start} to {period_end}")

        # Get all schedules in the period that have completed/confirmed timeslots
        schedules = Schedule.objects.filter(
            date__gte=period_start,
            date__lt=period_end,
            time_slots__status__in=['completed', 'confirmed']
        ).distinct()

        # Get unique patients from these schedules
        patients_with_timeslots = Patient.objects.filter(
            schedule__in=schedules
        ).distinct()

        total_patients = patients_with_timeslots.count()
        self.stdout.write(f"Found {total_patients} patients with timeslots in the period")

        invoices_created = 0
        errors = 0

        for patient in patients_with_timeslots:
            try:
                # Get all timeslots for this patient's schedules in the period
                patient_schedules = schedules.filter(patient=patient)
                timeslots = TimeSlot.objects.filter(
                    schedule__in=patient_schedules,
                    status__in=['completed', 'confirmed']
                ).distinct()

                if not timeslots.exists():
                    continue

                # Check if invoice already exists for this period
                existing_invoice = patient.invoice_set.filter(
                    period_start=period_start,
                    period_end=period_end
                ).first()

                if existing_invoice:
                    self.stdout.write(f"Invoice already exists for patient {patient.id} in this period")
                    continue

                # Generate invoice
                invoice = generate_invoice_for_patient_period(
                    patient=patient,
                    period_start=period_start,
                    period_end=period_end,
                    timeslots=timeslots
                )

                self.stdout.write(
                    f"Created invoice {invoice.id} for patient {patient.id} "
                    f"with {timeslots.count()} timeslots, "
                    f"total amount: {invoice.amount}€"
                )
                invoices_created += 1

            except Exception as e:
                self.stderr.write(f"Error generating invoice for patient {patient.id}: {str(e)}")
                logger.exception(f"Invoice generation error for patient {patient.id}")
                errors += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nInvoice generation completed:\n"
            f"- Total patients processed: {total_patients}\n"
            f"- Invoices created: {invoices_created}\n"
            f"- Errors encountered: {errors}"
        ))