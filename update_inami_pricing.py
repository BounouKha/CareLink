#!/usr/bin/env python3

"""
Update INAMI Pricing in Frontend
=================================

This script updates the INAMI pricing in the frontend modal with official RIZIV-INAMI data.
Run this after updating the pricing values in inami_pricing_config.py

Usage:
1. Update inami_pricing_config.py with official pricing
2. Run: python update_inami_pricing.py
"""

import os
import sys
import re
from inami_pricing_config import INAMI_CARE_TYPES

def update_frontend_pricing():
    """Update the INAMI modal with correct pricing from config"""
    
    print("🔧 Updating Frontend INAMI Pricing...")
    print("=" * 50)
    
    # Path to the INAMI modal file
    modal_path = os.path.join(
        "carelink-front", 
        "src", 
        "components", 
        "InamiMedicalCareModal.js"
    )
    
    if not os.path.exists(modal_path):
        print(f"❌ Modal file not found: {modal_path}")
        return
    
    try:
        # Read the current modal file
        with open(modal_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Generate the new careTypeOptions array
        new_care_types = "  // Care type options based on Belgian INAMI nursing codes\n"
        new_care_types += "  // Updated with official RIZIV-INAMI pricing\n"
        new_care_types += "  const careTypeOptions = [\n"
        
        for care_id, care_data in INAMI_CARE_TYPES.items():
            new_care_types += f"    {{ \n"
            new_care_types += f"      id: '{care_id}', \n"
            new_care_types += f"      label: '{care_data['label']}', \n"
            new_care_types += f"      mutuelle_price: {care_data['mutuelle_price']}, \n"
            new_care_types += f"      patient_copay: {care_data['patient_copay']},\n"
            new_care_types += f"      codes: {{\n"
            
            for location, code in care_data['codes'].items():
                new_care_types += f"        {location}: '{code}',\n"
            
            new_care_types += f"      }}\n"
            new_care_types += f"    }},\n"
        
        new_care_types += "  ];"
        
        # Replace the careTypeOptions in the file
        pattern = r'// Care type options.*?const careTypeOptions = \[.*?\];'
        
        if re.search(pattern, content, re.DOTALL):
            updated_content = re.sub(pattern, new_care_types, content, flags=re.DOTALL)
            
            # Write the updated content back
            with open(modal_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            print("✅ Frontend INAMI modal updated successfully!")
            print(f"📁 Updated file: {modal_path}")
            
            # Show summary of updates
            print(f"\n📋 Updated {len(INAMI_CARE_TYPES)} care types:")
            for care_id, care_data in INAMI_CARE_TYPES.items():
                print(f"   🔹 {care_data['label']}: €{care_data['mutuelle_price']} (mutuelle) + €{care_data['patient_copay']} (patient)")
            
        else:
            print("❌ Could not find careTypeOptions pattern in the modal file")
            print("⚠️  Manual update required")
            
    except Exception as e:
        print(f"❌ Error updating frontend: {e}")
        import traceback
        traceback.print_exc()

def validate_pricing():
    """Validate that pricing has been updated from default 0.00 values"""
    
    print("\n🔍 Validating Pricing Configuration...")
    print("-" * 40)
    
    has_zero_prices = False
    
    for care_id, care_data in INAMI_CARE_TYPES.items():
        if care_data['mutuelle_price'] == 0.00 and care_data['patient_copay'] == 0.00:
            print(f"⚠️  {care_data['label']}: Still has default 0.00 pricing")
            has_zero_prices = True
        else:
            print(f"✅ {care_data['label']}: €{care_data['mutuelle_price']} + €{care_data['patient_copay']}")
    
    if has_zero_prices:
        print("\n⚠️  WARNING: Some care types still have default 0.00 pricing")
        print("📋 Please update inami_pricing_config.py with official RIZIV-INAMI data")
    else:
        print("\n✅ All care types have been updated with pricing data")

if __name__ == "__main__":
    validate_pricing()
    
    response = input("\n❓ Do you want to update the frontend with current pricing? (y/N): ")
    if response.lower() in ['y', 'yes']:
        update_frontend_pricing()
    else:
        print("⏸️  Update cancelled. Update inami_pricing_config.py first.")
        print("\n📝 Next steps:")
        print("1. Go to https://webappsa.riziv-inami.fgov.be/Nomen/fr/<code>/fees")
        print("2. Get official pricing for each INAMI code")
        print("3. Update inami_pricing_config.py")
        print("4. Run this script again")
