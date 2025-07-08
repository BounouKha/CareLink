#!/usr/bin/env python3

"""
INAMI Pricing Helper - URLs for Remaining Codes
===============================================

This script provides the exact URLs you need to visit to get the remaining INAMI pricing.

Based on the pattern found, the pricing formula is:
Price = W_value × 5.724709

Current W base rate: 5.724709 (as of 01/01/2025)
"""

def show_remaining_codes():
    """Show the codes that still need official pricing"""
    
    remaining_codes = [
        {
            'code': '422275',
            'description': 'Injection intramusculaire/sous-cutanée',
            'url': 'https://webappsa.riziv-inami.fgov.be/Nomen/fr/422275',
            'status': 'NEEDS PRICING'
        },
        {
            'code': '423336', 
            'description': 'Perfusion',
            'url': 'https://webappsa.riziv-inami.fgov.be/Nomen/fr/423336',
            'status': 'NEEDS PRICING'
        },
        {
            'code': '422512',
            'description': 'Prise de sang',
            'url': 'https://webappsa.riziv-inami.fgov.be/Nomen/fr/422512', 
            'status': 'NEEDS PRICING'
        }
    ]
    
    completed_codes = [
        {
            'code': '425110',
            'description': 'Toilette (Soins d\'hygiène)',
            'w_value': '1.167',
            'price': '€6.68',
            'status': '✅ COMPLETED'
        },
        {
            'code': '424336',
            'description': 'Pansement simple', 
            'w_value': '1.459',
            'price': '€8.35',
            'status': '✅ COMPLETED'
        },
        {
            'code': '424255',
            'description': 'Surveillance de plaie',
            'w_value': '0.746', 
            'price': '€4.27',
            'status': '✅ COMPLETED'
        }
    ]
    
    print("🔧 INAMI Pricing Status Report")
    print("=" * 60)
    
    print("\n✅ COMPLETED CODES:")
    print("-" * 30)
    for code in completed_codes:
        print(f"🔹 {code['code']} - {code['description']}")
        print(f"   W Value: {code['w_value']} → Price: {code['price']} {code['status']}")
        print()
    
    print("⚠️  REMAINING CODES TO UPDATE:")
    print("-" * 35)
    for code in remaining_codes:
        print(f"🔸 {code['code']} - {code['description']}")
        print(f"   URL: {code['url']}")
        print(f"   Status: {code['status']}")
        print(f"   📋 Look for: 'Valeur(s) W [number]' on the page")
        print(f"   🧮 Formula: W_value × 5.724709 = Price in EUR")
        print()
    
    print("📝 INSTRUCTIONS:")
    print("1. Visit each URL above")
    print("2. Find the 'Valeur(s)' section with 'W [number]'")
    print("3. Calculate: W_value × 5.724709")
    print("4. Update inami_pricing_config.py with the result")
    print("5. Run: python update_inami_pricing.py")
    
    print(f"\n📊 PROGRESS: {len(completed_codes)}/{len(completed_codes) + len(remaining_codes)} codes completed")

def calculate_price():
    """Helper calculator for INAMI pricing"""
    print("\n🧮 INAMI Price Calculator")
    print("-" * 25)
    
    try:
        w_value = float(input("Enter the W value from RIZIV-INAMI page: "))
        base_rate = 5.724709
        price = w_value * base_rate
        
        print(f"\n📊 Calculation:")
        print(f"   W Value: {w_value}")
        print(f"   Base Rate: {base_rate}")
        print(f"   Price: €{price:.2f}")
        print(f"\n📋 Update code in inami_pricing_config.py:")
        print(f"   'mutuelle_price': {price:.2f},  # W={w_value} × {base_rate}")
        
    except ValueError:
        print("❌ Please enter a valid number")

if __name__ == "__main__":
    show_remaining_codes()
    
    print("\n" + "=" * 60)
    response = input("💡 Do you want to use the price calculator? (y/N): ")
    if response.lower() in ['y', 'yes']:
        while True:
            calculate_price()
            again = input("\nCalculate another? (y/N): ")
            if again.lower() not in ['y', 'yes']:
                break
    
    print("\n🎯 Next Steps:")
    print("1. Visit the URLs above to get W values")
    print("2. Update inami_pricing_config.py")  
    print("3. Run: python update_inami_pricing.py")
    print("4. Test with: python test_complete_inami_fixed.py")
