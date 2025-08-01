# Generated by Django 5.2.1 on 2025-07-01 09:54

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('CareLink', '0017_ticketcategory_enhancedticket_ticketcomment_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='invoice',
            name='service',
        ),
        migrations.RemoveField(
            model_name='invoice',
            name='timeslots',
        ),
        migrations.AddField(
            model_name='invoice',
            name='period_end',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='period_start',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='invoice',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='CareLink.invoice'),
        ),
        migrations.AlterField(
            model_name='invoice',
            name='amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.CreateModel(
            name='InvoiceLine',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('confirmed', 'Confirmed'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show')], max_length=20)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lines', to='CareLink.invoice')),
                ('provider', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='CareLink.provider')),
                ('service', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='CareLink.service')),
                ('timeslot', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='CareLink.timeslot')),
            ],
        ),
    ]
