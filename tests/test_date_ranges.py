import requests
import json
from datetime import date, timedelta

# Test with specific date range
base_url = 'http://localhost:8000'
test_credentials = {'email': 'fpatient1@carelink.be', 'password': 'Pugu8874@'}

# Login
login_response = requests.post(f'{base_url}/account/login/', data=test_credentials)
token = login_response.json()['access']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Test family schedule with different date ranges
print('=== Testing different date ranges ===')

# Current week (default)
response1 = requests.get(f'{base_url}/schedule/family/schedule/', headers=headers)
data1 = response1.json()
patients_count = len(data1.get('patients', []))
schedules_count = len(data1['patients'][0]['schedules']) if data1.get('patients') else 0
print(f'Default range: {patients_count} patients, schedules in first patient: {schedules_count}')

# Specific date range that includes June 4, 2025
start_date = '2025-06-04'
end_date = '2025-06-10'
response2 = requests.get(f'{base_url}/schedule/family/schedule/?start_date={start_date}&end_date={end_date}', headers=headers)
data2 = response2.json()
print(f'June 4-10 range: {len(data2.get("patients", []))} patients')
if data2.get('patients'):
    print(f'Schedules for first patient: {len(data2["patients"][0]["schedules"])}')
    if data2['patients'][0]['schedules']:
        print(f'First schedule date: {data2["patients"][0]["schedules"][0]["date"]}')
        print(f'Appointments: {len(data2["patients"][0]["schedules"][0]["appointments"])}')

# Show date ranges being used
print(f'Response 1 date range: {data1.get("date_range")}')
print(f'Response 2 date range: {data2.get("date_range")}')
