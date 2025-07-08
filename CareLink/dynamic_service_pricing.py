#!/usr/bin/env python3
"""
Dynamic Service Pricing Configuration for CareLink
Handles variable pricing for services like family help and housekeeping
Based on Belgian social services pricing scales
"""

# Service IDs that require dynamic pricing
VARIABLE_PRICING_SERVICES = [
    1,  # Aide menager (Family Help/Housekeeping)
    2,  # Aide familial (Family Aid)
    # Add other service IDs that need variable pricing
]

# Pricing tiers for variable pricing services (€/hour)
PRICING_TIERS = {
    'minimum': 0.94,      # Minimum social rate
    'low': 2.50,          # Low income bracket
    'medium_low': 4.20,   # Medium-low income bracket
    'medium': 6.10,       # Medium income bracket
    'medium_high': 7.85,  # Medium-high income bracket
    'maximum': 9.97,      # Maximum rate
}

# Patient criteria for pricing determination
PRICING_CRITERIA = {
    'has_social_benefits': {
        'bim': 'minimum',           # BIM cardholders
        'omnio': 'minimum',         # OMNIO beneficiaries
        'social_price': 'minimum',  # Other social benefits
    },
    'family_composition': {
        'single_elderly': 'low',
        'couple_elderly': 'medium_low',
        'family_with_children': 'medium',
        'large_family': 'low',
    },
    'income_bracket': {
        'very_low': 'minimum',
        'low': 'low',
        'medium_low': 'medium_low',
        'medium': 'medium',
        'medium_high': 'medium_high',
        'high': 'maximum',
    }
}

def calculate_service_price(patient, service, hours_per_session=1):
    """
    Calculate the appropriate price for a variable pricing service
    
    Args:
        patient: Patient object
        service: Service object
        hours_per_session: Number of hours per session
    
    Returns:
        dict: {
            'hourly_rate': float,
            'session_price': float,
            'tier': str,
            'reasoning': str
        }
    """
    
    # Check if service requires variable pricing
    if service.id not in VARIABLE_PRICING_SERVICES:
        return {
            'hourly_rate': float(service.price),
            'session_price': float(service.price) * hours_per_session,
            'tier': 'fixed',
            'reasoning': 'Fixed price service'
        }
    
    # Determine pricing tier based on patient criteria
    tier = determine_pricing_tier(patient)
    hourly_rate = PRICING_TIERS[tier]
    session_price = hourly_rate * hours_per_session
    
    return {
        'hourly_rate': hourly_rate,
        'session_price': session_price,
        'tier': tier,
        'reasoning': get_pricing_reasoning(patient, tier)
    }

def determine_pricing_tier(patient):
    """
    Determine the appropriate pricing tier for a patient
    
    Args:
        patient: Patient object
    
    Returns:
        str: pricing tier key
    """
    
    # Priority 1: Social benefits (always minimum rate)
    if hasattr(patient, 'social_price') and patient.social_price:
        return 'minimum'
    
    # Check for BIM/OMNIO status (would need to be added to patient model)
    if hasattr(patient, 'has_bim') and getattr(patient, 'has_bim', False):
        return 'minimum'
    
    if hasattr(patient, 'has_omnio') and getattr(patient, 'has_omnio', False):
        return 'minimum'
    
    # Priority 2: Income bracket (would need to be added to patient model)
    if hasattr(patient, 'income_bracket'):
        income_tier = PRICING_CRITERIA['income_bracket'].get(patient.income_bracket)
        if income_tier:
            return income_tier
    
    # Priority 3: Family composition assessment
    if hasattr(patient, 'family_composition'):
        family_tier = PRICING_CRITERIA['family_composition'].get(patient.family_composition)
        if family_tier:
            return family_tier
    
    # Default to medium rate if no specific criteria met
    return 'medium'

def get_pricing_reasoning(patient, tier):
    """
    Generate human-readable reasoning for the pricing decision
    
    Args:
        patient: Patient object
        tier: Selected pricing tier
    
    Returns:
        str: Explanation of pricing decision
    """
    
    if tier == 'minimum':
        if getattr(patient, 'social_price', False):
            return "Social benefits - minimum rate applied"
        elif hasattr(patient, 'has_bim') and getattr(patient, 'has_bim', False):
            return "BIM cardholder - minimum rate applied"
        elif hasattr(patient, 'has_omnio') and getattr(patient, 'has_omnio', False):
            return "OMNIO beneficiary - minimum rate applied"
    
    if hasattr(patient, 'income_bracket'):
        return f"Based on income bracket: {patient.income_bracket}"
    
    if hasattr(patient, 'family_composition'):
        return f"Based on family composition: {patient.family_composition}"
    
    return f"Standard rate for {tier} tier"

def get_available_pricing_options(patient, service):
    """
    Get all available pricing options for a service and patient
    Useful for coordinator override functionality
    
    Args:
        patient: Patient object
        service: Service object
    
    Returns:
        list: Available pricing options with details
    """
    
    if service.id not in VARIABLE_PRICING_SERVICES:
        return [{
            'tier': 'fixed',
            'hourly_rate': float(service.price),
            'label': f"Fixed Rate: €{service.price}/session",
            'is_default': True
        }]
    
    recommended_tier = determine_pricing_tier(patient)
    options = []
    
    for tier, rate in PRICING_TIERS.items():
        options.append({
            'tier': tier,
            'hourly_rate': rate,
            'label': f"{tier.replace('_', ' ').title()}: €{rate}/hour",
            'is_default': tier == recommended_tier,
            'reasoning': get_pricing_reasoning(patient, tier) if tier == recommended_tier else None
        })
    
    return options

# Configuration for frontend integration
FRONTEND_CONFIG = {
    'variable_pricing_services': VARIABLE_PRICING_SERVICES,
    'pricing_tiers': PRICING_TIERS,
    'enable_coordinator_override': True,  # Allow coordinators to override pricing
    'show_pricing_reasoning': True,       # Show explanation to coordinators
}
