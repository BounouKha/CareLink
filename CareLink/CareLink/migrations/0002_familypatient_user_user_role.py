# Generated by Django 5.2.1 on 2025-05-28 07:58

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('CareLink', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='familypatient',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='family_patients', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(blank=True, choices=[('Administrative', 'Administrative'), ('Patient', 'Patient'), ('Coordinator', 'Coordinator'), ('Family Patient', 'Family Patient'), ('Social Assistant', 'Social Assistant'), ('Provider', 'Provider')], max_length=20, null=True),
        ),
    ]
