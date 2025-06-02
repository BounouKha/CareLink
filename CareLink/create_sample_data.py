#!/usr/bin/env python
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import Schedule, TimeSlot, Patient, User, Service
from datetime import time, date

def create_sample_appointments():
    # Get Bob's patient record
    bob = User.objects.get(email='bob@sull.be')
    patient = Patient.objects.get(user=bob)
    
    # Get a service for the appointment
    service = Service.objects.first()
    print(f'Using service: {service.name if service else "No service found"}')
    
    # Get Bob's schedules
    schedules = Schedule.objects.filter(patient=patient)
    print(f'Bob has {schedules.count()} schedules')
    
    # Add timeslots to the first schedule
    if schedules.exists():
        schedule = schedules.first()
        print(f'Working with schedule {schedule.id} on {schedule.date}')
        
        # Create a timeslot for this schedule
        timeslot1 = TimeSlot.objects.create(
            start_time=time(10, 0),  # 10:00 AM
            end_time=time(11, 0),    # 11:00 AM
            description='General medical consultation',
            service=service,
            user=bob
        )
        
        # Add the timeslot to the schedule
        schedule.time_slots.add(timeslot1)
        
        # Create another timeslot for testing
        timeslot2 = TimeSlot.objects.create(
            start_time=time(14, 30),  # 2:30 PM
            end_time=time(15, 30),    # 3:30 PM
            description='Follow-up consultation',
            service=service,
            user=bob
        )
        
        schedule.time_slots.add(timeslot2)
        schedule.save()
        
        print(f'Created timeslot {timeslot1.id}: {timeslot1.start_time}-{timeslot1.end_time}')
        print(f'Created timeslot {timeslot2.id}: {timeslot2.start_time}-{timeslot2.end_time}')
        print(f'Schedule {schedule.id} now has {schedule.time_slots.count()} timeslots')
        
        # Add a timeslot to the second schedule too
        if schedules.count() > 1:
            schedule2 = schedules[1]
            timeslot3 = TimeSlot.objects.create(
                start_time=time(9, 0),   # 9:00 AM
                end_time=time(9, 30),    # 9:30 AM
                description='Quick check-up',
                service=service,
                user=bob
            )
            schedule2.time_slots.add(timeslot3)
            schedule2.save()
            print(f'Added timeslot to schedule {schedule2.id}: {timeslot3.start_time}-{timeslot3.end_time}')

if __name__ == '__main__':
    create_sample_appointments()
