from django.core.management.base import BaseCommand
from CareLink.models import Patient, User, MedicalFolder, UserActionLog, Invoice
import random
import string

class Command(BaseCommand):
    help = 'Anonymize a patient and their user account for GDPR compliance.'

    def add_arguments(self, parser):
        parser.add_argument('patient_id', type=int, help='ID of the patient to anonymize')

    def handle(self, *args, **options):
        patient_id = options['patient_id']
        try:
            patient = Patient.objects.get(id=patient_id)
            user = patient.user
            
            if not user:
                self.stdout.write(
                    self.style.ERROR(f'Patient {patient_id} has no associated user account.')
                )
                return
            
            # Check for open invoices
            open_invoices = Invoice.objects.filter(
                patient=patient,
                status__in=['In Progress', 'Contested']
            )
            
            if open_invoices.exists():
                self.stdout.write(
                    self.style.ERROR(
                        f'Cannot anonymize patient {patient_id}. '
                        f'Patient has {open_invoices.count()} open invoice(s).'
                    )
                )
                for invoice in open_invoices:
                    self.stdout.write(
                        f'  - Invoice #{invoice.id}: {invoice.status} (€{invoice.amount})'
                    )
                return
            
            # Anonymize User
            user.firstname = 'Anonymized'
            user.lastname = 'User'
            user.email = f"anon{user.id}@example.com"
            user.address = ''
            user.national_number = None
            user.birthdate = None
            user.is_active = False
            # Set a random password
            user.set_password(''.join(random.choices(string.ascii_letters + string.digits, k=32)))
            user.save()
            
            # Anonymize Patient
            patient.gender = None
            patient.blood_type = None
            patient.katz_score = None
            patient.it_score = None
            patient.illness = ''
            patient.critical_information = ''
            patient.medication = ''
            patient.doctor_name = ''
            patient.doctor_address = ''
            patient.doctor_phone = ''
            patient.doctor_email = ''
            patient.is_anonymized = True
            patient.save()
            
            # Anonymize MedicalFolder notes
            MedicalFolder.objects.filter(patient=patient).update(note='[ANONYMIZED]')
            
            # Log the action
            UserActionLog.objects.create(
                user=user,  # The user being anonymized
                action_type='PROFILE_ANONYMIZED',
                target_model='Patient',
                target_id=patient.id,
                description=f'Patient {patient.id} and user account anonymized for GDPR compliance'
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'Patient {patient_id} and user account anonymized successfully.')
            )
            
        except Patient.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Patient with ID {patient_id} does not exist.')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error anonymizing patient {patient_id}: {str(e)}')
            ) 