#!/usr/bin/env python
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Patient, User

def test_doctor_info():
    """Test doctor information functionality"""
    print("=== Testing Doctor Information ===\n")
    
    # Check if there are any patients with doctor information
    patients_with_doctor = Patient.objects.filter(doctor_name__isnull=False).exclude(doctor_name='')
    
    print(f"Patients with doctor information: {patients_with_doctor.count()}")
    
    if patients_with_doctor.exists():
        print("\n=== Patients with Doctor Info ===")
        for patient in patients_with_doctor[:5]:  # Show first 5
            user_name = f"{patient.user.firstname} {patient.user.lastname}" if patient.user else "Unknown"
            print(f"\nPatient: {user_name} (ID: {patient.id})")
            print(f"  Doctor Name: {patient.doctor_name}")
            print(f"  Doctor Phone: {patient.doctor_phone or 'Not provided'}")
            print(f"  Doctor Email: {patient.doctor_email or 'Not provided'}")
            print(f"  Doctor Address: {patient.doctor_address or 'Not provided'}")
    else:
        print("\nNo patients with doctor information found.")
        
        # Create a test patient with doctor info
        print("\n=== Creating Test Patient with Doctor Info ===")
        try:
            # Get first user or create one
            user = User.objects.first()
            if not user:
                print("No users found. Please create a user first.")
                return
                
            # Create or get patient
            patient, created = Patient.objects.get_or_create(
                user=user,
                defaults={
                    'gender': 'M',
                    'doctor_name': 'Dr. John Smith',
                    'doctor_phone': '+32 2 123 45 67',
                    'doctor_email': 'john.smith@clinic.be',
                    'doctor_address': '123 Medical Street, Brussels, Belgium'
                }
            )
            
            if created:
                print(f"✅ Created new patient for user: {user.firstname} {user.lastname}")
            else:
                # Update existing patient with doctor info
                patient.doctor_name = 'Dr. John Smith'
                patient.doctor_phone = '+32 2 123 45 67'
                patient.doctor_email = 'john.smith@clinic.be'
                patient.doctor_address = '123 Medical Street, Brussels, Belgium'
                patient.save()
                print(f"✅ Updated existing patient for user: {user.firstname} {user.lastname}")
            
            print(f"  Doctor Name: {patient.doctor_name}")
            print(f"  Doctor Phone: {patient.doctor_phone}")
            print(f"  Doctor Email: {patient.doctor_email}")
            print(f"  Doctor Address: {patient.doctor_address}")
            
        except Exception as e:
            print(f"❌ Error creating test patient: {e}")
    
    print("\n=== Doctor Info Fields Check ===")
    # Check if the fields exist in the model
    patient_fields = [field.name for field in Patient._meta.get_fields()]
    doctor_fields = ['doctor_name', 'doctor_address', 'doctor_phone', 'doctor_email']
    
    for field in doctor_fields:
        if field in patient_fields:
            print(f"✅ {field} field exists")
        else:
            print(f"❌ {field} field missing")

if __name__ == '__main__':
    test_doctor_info() 