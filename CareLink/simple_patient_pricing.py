#!/usr/bin/env python3
"""
Simple Patient-Specific Pricing for CareLink
Handles patient-specific hourly rates for services like family help and housekeeping
"""

# Service IDs that use patient-specific hourly rates
HOURLY_RATE_SERVICES = [
    1,  # Aide menager (Family Help/Housekeeping)
    # Add other service IDs that need patient-specific hourly rates
]

def get_service_price_for_patient(patient, service, hours=1):
    """
    Get the appropriate price for a service based on patient-specific rates
    
    Args:
        patient: Patient object
        service: Service object  
        hours: Number of hours for the service
    
    Returns:
        dict: {
            'price': float,
            'is_hourly_rate': bool,
            'hourly_rate': float or None,
            'needs_rate_setup': bool
        }
    """
    
    # Check if this service uses patient-specific hourly rates
    if service.id not in HOURLY_RATE_SERVICES:
        return {
            'price': float(service.price) * hours,
            'is_hourly_rate': False,
            'hourly_rate': None,
            'needs_rate_setup': False
        }
    
    # Check if patient has a specific hourly rate set
    if patient.hourly_rate is not None:
        return {
            'price': float(patient.hourly_rate) * hours,
            'is_hourly_rate': True,
            'hourly_rate': float(patient.hourly_rate),
            'needs_rate_setup': False
        }
    
    # Patient needs hourly rate setup
    return {
        'price': 0.00,  # No price until rate is set
        'is_hourly_rate': True,
        'hourly_rate': None,
        'needs_rate_setup': True
    }

def validate_hourly_rate(rate):
    """
    Validate that the hourly rate is within acceptable range
    
    Args:
        rate: float or string representing the hourly rate
    
    Returns:
        dict: {
            'is_valid': bool,
            'rate': float,
            'error': str or None
        }
    """
    
    try:
        rate_float = float(rate)
    except (ValueError, TypeError):
        return {
            'is_valid': False,
            'rate': 0.0,
            'error': 'Invalid rate format'
        }
    
    if rate_float < 0.94:
        return {
            'is_valid': False,
            'rate': rate_float,
            'error': 'Rate must be at least €0.94/hour'
        }
    
    if rate_float > 9.97:
        return {
            'is_valid': False,
            'rate': rate_float,
            'error': 'Rate cannot exceed €9.97/hour'
        }
    
    return {
        'is_valid': True,
        'rate': rate_float,
        'error': None
    }

# Common suggested rates for quick setup
SUGGESTED_RATES = [
    {'rate': 0.94, 'label': '€0.94/h - Minimum social rate'},
    {'rate': 1.50, 'label': '€1.50/h - Low income'},
    {'rate': 2.80, 'label': '€2.80/h - Social benefits'},
    {'rate': 4.20, 'label': '€4.20/h - Medium-low'},
    {'rate': 6.10, 'label': '€6.10/h - Standard rate'},
    {'rate': 7.85, 'label': '€7.85/h - Higher income'},
    {'rate': 9.97, 'label': '€9.97/h - Maximum rate'},
]
