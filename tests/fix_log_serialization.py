#!/usr/bin/env python3
"""
Check and fix additional_data JSON serialization in UserActionLog
"""
import os
import sys
import django
import json

# Add CareLink directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'CareLink'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CareLink.settings')
django.setup()

from CareLink.models import UserActionLog

def check_and_fix_logs():
    """Check for logs with dict additional_data and fix them"""
    print("🔍 Checking UserActionLog entries for JSON serialization issues...")
    
    # Get all logs with additional_data
    logs = UserActionLog.objects.filter(additional_data__isnull=False)
    print(f"📊 Total logs with additional_data: {logs.count()}")
    
    # Find logs with dict additional_data
    dict_logs = []
    fixed_count = 0
    
    for log in logs:
        if isinstance(log.additional_data, dict):
            dict_logs.append(log)
            print(f"🔧 Fixing Log ID {log.id}: converting dict to JSON string")
            # Convert dict to JSON string
            log.additional_data = json.dumps(log.additional_data)
            log.save()
            fixed_count += 1
    
    print(f"✅ Fixed {fixed_count} log entries with dict additional_data")
    
    # Test parsing after fixes
    print("\n🧪 Testing JSON parsing after fixes...")
    for log in UserActionLog.objects.filter(additional_data__isnull=False)[:5]:
        try:
            if isinstance(log.additional_data, str):
                parsed = json.loads(log.additional_data)
                print(f"✅ Log ID {log.id}: Successfully parsed JSON")
            else:
                print(f"⚠️  Log ID {log.id}: Still has type {type(log.additional_data)}")
        except Exception as e:
            print(f"❌ Log ID {log.id}: Error parsing JSON: {e}")
    
    return fixed_count

if __name__ == "__main__":
    fixed = check_and_fix_logs()
    if fixed > 0:
        print(f"\n🎉 Successfully fixed {fixed} log entries!")
        print("The enhanced logging system should now work correctly.")
    else:
        print("\n✅ No issues found with additional_data serialization.")
