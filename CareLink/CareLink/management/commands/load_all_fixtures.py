from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Load all JSON fixtures into the database'

    def handle(self, *args, **kwargs):
        fixtures = [
            "administrative_data.json",
            "contestinvoice_data.json",
            "contract_data.json",
            "coordinator_data.json",
            "familypatient_data.json",
            "informationproviding_data.json",
            "invoice_data.json",
            "medicalfolder_data.json",
            "patient_data.json",
            "phoneuser_data.json",
            "prescription_data.json",
            "provider_data.json",
            "providingcare_data.json",
            "schedule_data.json",
            "service_data.json",
            "tickethelpdesk_data.json",
            "user_data.json",
        ]

        for fixture in fixtures:
            self.stdout.write(f"Loading {fixture}...")
            call_command('loaddata', fixture)
            self.stdout.write(self.style.SUCCESS(f"Successfully loaded {fixture}"))
