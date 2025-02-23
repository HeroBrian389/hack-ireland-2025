import os
import requests
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import json
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get credentials from environment variables
CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

if not CLIENT_ID or not CLIENT_SECRET:
    raise ValueError(
        "Missing required environment variables. Please ensure GOOGLE_CLIENT_ID and "
        "GOOGLE_CLIENT_SECRET are set in your .env file"
    )

# Define the scopes required for accessing health data
SCOPES = ['https://www.googleapis.com/auth/fitness.body.read',
          'https://www.googleapis.com/auth/fitness.body.write']

# Define the token file to store the user's access and refresh tokens
TOKEN_FILE = 'token.json'

# These will be set by the main script after registration
DATA_SOURCE_ID = None
DATA_SOURCE_ID_HEIGHT = None

def set_data_source_ids(weight_id, hr_id, bp_id, o2_id, height_id):
    """Set the data source IDs after registration"""
    global DATA_SOURCE_ID, DATA_SOURCE_ID_HEIGHT
    DATA_SOURCE_ID = weight_id
    DATA_SOURCE_ID_HEIGHT = height_id

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(
                {
                    "installed": {
                        "client_id": CLIENT_ID,
                        "client_secret": CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": ["http://localhost:8080/"]
                    }
                },
                SCOPES
            )
            creds = flow.run_local_server(port=8080)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    return creds

def insert_weight_data(creds, weight_kg, timestamp_ns=None):
    endpoint = f'https://www.googleapis.com/fitness/v1/users/me/dataSources/{DATA_SOURCE_ID}/datasets'
    headers = {
        'Authorization': f'Bearer {creds.token}',
        'Content-Type': 'application/json'
    }
    now_ns = timestamp_ns or int(time.time() * 1e9)
    dataset_id = f'{now_ns}-{now_ns}'
    
    data_point = {
        "dataSourceId": DATA_SOURCE_ID,
        "maxEndTimeNs": now_ns,
        "minStartTimeNs": now_ns,
        "point": [
            {
                "dataTypeName": "com.google.weight",
                "startTimeNanos": now_ns,
                "endTimeNanos": now_ns,
                "value": [{"fpVal": weight_kg}]
            }
        ]
    }
    
    response = requests.patch(f'{endpoint}/{dataset_id}', headers=headers, data=json.dumps(data_point))
    if response.status_code == 200:
        print(f"Weight data ({weight_kg} kg) inserted successfully.")
    else:
        print("Error inserting weight data:", response.status_code, response.text)

def insert_height_data(creds, height_meters):
    endpoint = f'https://www.googleapis.com/fitness/v1/users/me/dataSources/{DATA_SOURCE_ID_HEIGHT}/datasets'
    headers = {
        'Authorization': f'Bearer {creds.token}',
        'Content-Type': 'application/json'
    }
    now_ns = int(time.time() * 1e9)
    dataset_id = f'{now_ns}-{now_ns}'
    
    data_point = {
        "dataSourceId": DATA_SOURCE_ID_HEIGHT,
        "maxEndTimeNs": now_ns,
        "minStartTimeNs": now_ns,
        "point": [
            {
                "dataTypeName": "com.google.height",
                "startTimeNanos": now_ns,
                "endTimeNanos": now_ns,
                "value": [{"fpVal": height_meters}]
            }
        ]
    }
    
    response = requests.patch(f'{endpoint}/{dataset_id}', headers=headers, data=json.dumps(data_point))
    if response.status_code == 200:
        print(f"Height data ({height_meters}m) inserted successfully.")
    else:
        print("Error inserting height data:", response.status_code, response.text)

def fetch_weight_data(creds):
    headers = {
        'Authorization': f'Bearer {creds.token}',
        'Content-Type': 'application/json'
    }
    thirty_days_ms = 30 * 24 * 60 * 60 * 1000
    end_time_ms = int(time.time() * 1000)
    start_time_ms = end_time_ms - thirty_days_ms

    body = {
        "aggregateBy": [{
            "dataTypeName": "com.google.weight"
        }],
        "startTimeMillis": start_time_ms,
        "endTimeMillis": end_time_ms
    }
    response = requests.post(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        headers=headers,
        data=json.dumps(body)
    )
    if response.status_code == 200:
        weight_data = response.json()
        format_weight_data(weight_data)
    else:
        print("Error:", response.status_code, response.text)

def format_weight_data(data):
    print("\nWeight Data Summary:")
    print("-" * 50)
    
    for bucket in data['bucket']:
        for dataset in bucket['dataset']:
            for point in dataset['point']:
                timestamp = int(point['startTimeNanos']) // 1000000000
                date = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
                weight = point['value'][0]['fpVal']
                source = point.get('originDataSourceId', 'Unknown source')
                
                print(f"Date: {date}")
                print(f"Weight: {weight} kg")
                print(f"Source: {source}")
                print("-" * 50) 