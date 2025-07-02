from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from CareLink.models import Patient, Service, TimeSlot, Prescription, Invoice, User
from account.invoice_utils import generate_invoice_for_patient_period
from django.db import transaction

class Command(BaseCommand):
    help = 'Creates test invoices for June'

    def create_test_user_and_patient(self):
        # Create a test user if none exists
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'firstname': 'Test',
                'lastname': 'Patient',
                'role': 'Patient',
                'is_active': True,
                'national_number': '12345678901'
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created test user: {user.email}'))

        # Create a patient for the user if none exists
        patient, created = Patient.objects.get_or_create(
            user=user,
            defaults={
                'gender': 'M',
                'emergency_contact': '123456789',
                'social_price': False,
                'is_alive': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created test patient for user: {user.email}'))
        return patient

    def handle(self, *args, **options):
        with transaction.atomic():
            # Get or create a test service
            service, _ = Service.objects.get_or_create(
                name='Home Care Service',
                defaults={
                    'price': 50.00,
                    'description': 'Standard home care service'
                }
            )

            # Get all patients or create a test one if none exist
            patients = Patient.objects.all()
            if not patients.exists():
                patient = self.create_test_user_and_patient()
                patients = [patient]

            june_start = datetime(2024, 6, 1).date()
            june_end = datetime(2024, 6, 30).date()

            for patient in patients:
                try:
                    if not hasattr(patient, 'user') or not patient.user:
                        self.stdout.write(self.style.WARNING(f'Patient {patient.id} has no user, creating one...'))
                        # Create a user for this patient
                        user = User.objects.create(
                            email=f'patient{patient.id}@example.com',
                            firstname=f'Patient{patient.id}',
                            lastname='Test',
                            role='Patient',
                            is_active=True,
                            national_number=f'{10000000000 + patient.id}'
                        )
                        user.set_password('testpass123')
                        user.save()
                        patient.user = user
                        patient.save()
                        self.stdout.write(self.style.SUCCESS(f'Created user for patient {patient.id}'))

                    # Create a prescription for June
                    prescription = Prescription.objects.create(
                        service=service,
                        start_date=june_start,
                        end_date=june_end,
                        status='accepted',
                        medication='N/A',
                        frequency=3  # 3 times per week
                    )

                    # Create some timeslots for June
                    timeslots = []
                    current_date = june_start
                    while current_date <= june_end:
                        if current_date.weekday() in [0, 2, 4]:  # Monday, Wednesday, Friday
                            timeslot = TimeSlot.objects.create(
                                start_time=timezone.datetime.strptime('09:00', '%H:%M').time(),
                                end_time=timezone.datetime.strptime('10:00', '%H:%M').time(),
                                status='completed',
                                prescription=prescription,
                                user=patient.user,
                                service=service
                            )
                            timeslots.append(timeslot)
                        current_date += timedelta(days=1)

                    # Generate invoice for the patient
                    invoice = generate_invoice_for_patient_period(patient, june_start, june_end, timeslots)
                    self.stdout.write(self.style.SUCCESS(
                        f'Successfully created invoice for patient {patient.user.firstname} {patient.user.lastname}'
                        f' with {len(timeslots)} sessions, total amount: €{invoice.amount}'
                    ))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'Failed to create invoice for patient {patient.id}: {str(e)}'
                    )) 