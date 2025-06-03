#!/usr/bin/env python3
"""
Debug the family member name display issue
"""

import requests
import json

def debug_family_member_names():
    print("🔍 DEBUGGING FAMILY MEMBER NAME DISPLAY")
    print("=" * 50)
    
    # Login
    login_response = requests.post("http://localhost:8000/account/login/", json={
        "email": "fpatient1@carelink.be",
        "password": "Pugu8874@"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = login_response.json().get('access')
    
    # Get profile
    profile_response = requests.get("http://localhost:8000/account/profile/", 
                                  headers={'Authorization': f'Bearer {token}'})
    
    if profile_response.status_code == 200:
        data = profile_response.json()
        print("📋 Complete Profile Response:")
        print(json.dumps(data, indent=2, default=str))
        
        family_list = data.get('family_list', [])
        print(f"\n👥 Family List Analysis:")
        print(f"   Number of family members: {len(family_list)}")
        
        for i, member in enumerate(family_list):
            print(f"\n   Member {i+1}:")
            print(f"      Raw data: {member}")
            print(f"      Keys: {list(member.keys())}")
            
            # Check different possible name fields
            possible_names = ['firstname', 'first_name', 'name', 'user__firstname']
            for name_field in possible_names:
                if name_field in member:
                    print(f"      Found {name_field}: {member[name_field]}")

if __name__ == "__main__":
    debug_family_member_names()
