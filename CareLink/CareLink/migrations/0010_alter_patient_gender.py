# Generated by Django 5.2.1 on 2025-06-09 13:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('CareLink', '0009_useractionlog_additional_data_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='gender',
            field=models.CharField(choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')], max_length=1),
        ),
    ]
