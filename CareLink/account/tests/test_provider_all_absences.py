from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from datetime import date, time, timedelta
from django.apps import apps

# Get models through apps to avoid import issues
User = apps.get_model('CareLink', 'User')
Provider = apps.get_model('CareLink', 'Provider')
Service = apps.get_model('CareLink', 'Service')
ProviderAbsence = apps.get_model('CareLink', 'ProviderAbsence')
ProviderShortAbsence = apps.get_model('CareLink', 'ProviderShortAbsence')

class ProviderAbsenceTests(TestCase):
    def setUp(self):
        # Create test service
        self.service = Service.objects.create(
            name='Test Service',
            price=100.00,
            description='Test Service Description'
        )

        # Create coordinator user (REMOVED_EMAIL)
        self.coordinator = User.objects.create_user(
            email='REMOVED_EMAIL',
            password='testpass123',
            firstname='Test',
            lastname='Coordinator',
            role='Coordinator'
        )

        # Create provider user
        self.provider_user = User.objects.create_user(
            email='provider@test.com',
            password='testpass123',
            firstname='Test',
            lastname='Provider',
            role='Provider'
        )

        # Create provider
        self.provider = Provider.objects.create(
            user=self.provider_user,
            service=self.service,
            is_internal=True
        )

        # Create administrative user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            firstname='Test',
            lastname='Admin',
            role='Administrative'
        )

        # Create regular patient user (should not have access)
        self.patient_user = User.objects.create_user(
            email='patient@test.com',
            password='testpass123',
            firstname='Test',
            lastname='Patient',
            role='Patient'
        )

        # Initialize the test client
        self.client = APIClient()

    def test_provider_absences_access_permissions(self):
        """Test access permissions for provider absences endpoint"""
        url = reverse('provider_absences', args=[self.provider.id])

        # Test unauthorized access
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)  # Unauthorized

        # Test coordinator access (REMOVED_EMAIL)
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(user=None)

        # Test provider's own access
        self.client.force_authenticate(user=self.provider_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(user=None)

        # Test administrative access
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(user=None)

        # Test patient access (should be forbidden)
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(user=None)

    def test_create_full_day_absence(self):
        """Test creating a full-day absence as coordinator"""
        self.client.force_authenticate(user=self.coordinator)
        url = reverse('provider_absences', args=[self.provider.id])

        # Create a full-day absence
        data = {
            'start_date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'end_date': (timezone.now() + timedelta(days=3)).date().isoformat(),
            'absence_type': 'vacation',
            'reason': 'Annual leave'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(ProviderAbsence.objects.filter(provider=self.provider).exists())

    def test_create_short_absence(self):
        """Test creating a short absence as coordinator"""
        self.client.force_authenticate(user=self.coordinator)
        
        # Create a short absence
        short_absence = ProviderShortAbsence.objects.create(
            provider=self.provider,
            date=timezone.now().date(),
            start_time=time(12, 0),  # 12:00
            end_time=time(13, 0),    # 13:00
            absence_type='meal',
            reason='Lunch break',
            created_by=self.coordinator
        )

        # Verify the short absence was created
        self.assertTrue(ProviderShortAbsence.objects.filter(id=short_absence.id).exists())

    def test_get_all_absences(self):
        """Test retrieving all absences (both full-day and short)"""
        # Create test absences
        full_absence = ProviderAbsence.objects.create(
            provider=self.provider,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=2)).date(),
            absence_type='vacation',
            reason='Vacation',
            created_by=self.coordinator
        )

        short_absence = ProviderShortAbsence.objects.create(
            provider=self.provider,
            date=timezone.now().date(),
            start_time=time(12, 0),
            end_time=time(13, 0),
            absence_type='meal',
            reason='Lunch break',
            created_by=self.coordinator
        )

        # Test as coordinator
        self.client.force_authenticate(user=self.coordinator)
        url = reverse('provider_all_absences', args=[self.provider.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['full_absences']), 1)
        self.assertEqual(len(response.data['short_absences']), 1)
        self.assertEqual(response.data['total'], 2)

    def test_overlapping_absences(self):
        """Test handling of overlapping absences"""
        self.client.force_authenticate(user=self.coordinator)
        
        # Create first absence
        first_absence = ProviderShortAbsence.objects.create(
            provider=self.provider,
            date=timezone.now().date(),
            start_time=time(12, 0),
            end_time=time(13, 0),
            absence_type='meal',
            reason='Lunch break',
            created_by=self.coordinator
        )

        # Try to create overlapping absence
        second_absence = ProviderShortAbsence(
            provider=self.provider,
            date=timezone.now().date(),
            start_time=time(12, 30),  # Overlaps with first absence
            end_time=time(13, 30),
            absence_type='training',
            reason='Training session',
            created_by=self.coordinator
        )

        # This should raise a validation error
        with self.assertRaises(Exception):
            second_absence.full_clean()

    def test_absence_date_validation(self):
        """Test date validation for absences"""
        self.client.force_authenticate(user=self.coordinator)
        url = reverse('provider_absences', args=[self.provider.id])

        # Try to create absence with end_date before start_date
        data = {
            'start_date': (timezone.now() + timedelta(days=3)).date().isoformat(),
            'end_date': (timezone.now() + timedelta(days=1)).date().isoformat(),
            'absence_type': 'vacation',
            'reason': 'Invalid date test'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)  # Should fail validation 