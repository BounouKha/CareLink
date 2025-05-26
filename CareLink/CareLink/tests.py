from django.test import TestCase
from .models import Service, InformationProviding
from django.core.exceptions import ValidationError
from .models import Patient, Provider, Coordinator

class ServiceModelTest(TestCase):

    def test_service_price_positive(self):
        """Ensure that a positive price is valid."""
        service = Service(name="Test Service", price=100.00, description="Test Description")
        service.full_clean()  # Should not raise ValidationError

    def test_service_price_negative(self):
        """Ensure that a negative price raises a ValidationError."""
        service = Service(name="Test Service", price=-100.00, description="Test Description")
        with self.assertRaises(ValidationError):
            service.full_clean()

class InformationProvidingModelTest(TestCase):

    def setUp(self):
        """Set up required instances for the tests."""
        self.patient = Patient.objects.create(user=None, gender='M', emergency_contact='1234567890')
        self.provider = Provider.objects.create(user=None, service=None, is_internal=True)
        self.service = Service.objects.create(name="Test Service", price=200.00, description="Test Description")
        self.coordinator = Coordinator.objects.create(user=None, is_internal=True)

    def test_information_providing_price_positive(self):
        """Ensure that a positive price is valid."""
        info_providing = InformationProviding(
            patient=self.patient,
            provider=self.provider,
            service=self.service,
            coordinator=self.coordinator,
            price=200.00
        )
        info_providing.full_clean()  # Should not raise ValidationError

    def test_information_providing_price_negative(self):
        """Ensure that a negative price raises a ValidationError."""
        info_providing = InformationProviding(
            patient=self.patient,
            provider=self.provider,
            service=self.service,
            coordinator=self.coordinator,
            price=-200.00
        )
        with self.assertRaises(ValidationError):
            info_providing.full_clean()
