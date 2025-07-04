# Generated by Django 5.2.1 on 2025-06-26 08:31

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('CareLink', '0014_contract_contract_reference_contract_department_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProviderAbsence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('absence_type', models.CharField(choices=[('vacation', 'Vacation'), ('sick_leave', 'Sick Leave'), ('personal', 'Personal Leave'), ('training', 'Training'), ('other', 'Other')], default='vacation', max_length=20)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('active', 'Active'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='scheduled', max_length=20)),
                ('reason', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_absences', to=settings.AUTH_USER_MODEL)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='absences', to='CareLink.provider')),
            ],
            options={
                'ordering': ['-start_date'],
            },
        ),
    ]
