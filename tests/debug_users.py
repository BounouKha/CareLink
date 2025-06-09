import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import User

users = User.objects.all()
print('All users and their roles:')
for user in users:
    print(f'ID: {user.id}, Name: {user.firstname} {user.lastname}, Role: "{user.role}"')

print('\nFamily Patient users specifically:')
family_patients = User.objects.filter(role__icontains='family')
for user in family_patients:
    print(f'ID: {user.id}, Name: {user.firstname} {user.lastname}, Role: "{user.role}"')
