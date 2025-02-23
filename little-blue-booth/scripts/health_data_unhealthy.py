import os
from dotenv import load_dotenv
import requests
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import json
import time
from health_data_utils import (
    get_credentials,
    insert_weight_data,
    insert_height_data,
    fetch_weight_data,
    set_data_source_ids
)

# Load environment variables from .env file
load_dotenv(dotenv_path='../.env')

# Get credentials from environment variables
CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

if not CLIENT_ID or not CLIENT_SECRET:
    raise ValueError("Google OAuth credentials not found in environment variables")

# Define the scopes required for accessing health data
SCOPES = ['https://www.googleapis.com/auth/fitness.body.read',
          'https://www.googleapis.com/auth/fitness.body.write']

# Define the token file to store the user's access and refresh tokens
TOKEN_FILE = 'token.json'

def register_data_source(creds, data_source_id, data_type, name):
    """Register a data source with Google Fit"""
    headers = {
        'Authorization': f'Bearer {creds.token}',
        'Content-Type': 'application/json'
    }
    
    device_info = {
        "type": "unknown",
        "manufacturer": "unknown",
        "model": "unknown",
        "uid": "1234567890",
        "version": "1.0"
    }
    
    # Construct the data stream ID in the format Google expects
    data_stream_id = f"raw:{data_type}:839371459434:{device_info['manufacturer']}:{device_info['model']}:{device_info['uid']}"
    
    data_source = {
        "dataStreamId": data_stream_id,
        "type": "raw",
        "application": {
            "name": "Little Blue Booth"
        },
        "dataType": {
            "name": data_type,
            "field": [{"name": "weight" if data_type == "com.google.weight" else "height", "format": "floatPoint"}]
        },
        "device": device_info
    }
    
    response = requests.post(
        'https://www.googleapis.com/fitness/v1/users/me/dataSources',
        headers=headers,
        json=data_source
    )
    
    if response.status_code == 200 or response.status_code == 409:  # 409 means already exists
        print(f"Data source {name} registered successfully")
        return data_stream_id
    else:
        print(f"Error registering {name} data source:", response.status_code, response.text)
        return None

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

def insert_unhealthy_data_points(creds, days_back=7):
    """Insert multiple data points over the past few days to show concerning trends"""
    current_time = time.time()
    day_in_seconds = 24 * 60 * 60
    
    # Simulate worsening vital signs over the past week
    for i in range(days_back):
        time_point = current_time - (i * day_in_seconds)
        time_ns = int(time_point * 1e9)
        
        # Weight increasing rapidly (could indicate fluid retention)
        weight = 95.0 - (i * 0.8)  # Starting at 95kg, was lighter in the past
        insert_weight_data(creds, weight, time_ns)
        
        print(f"\nDay -{i} metrics:")
        print(f"Weight: {weight:.1f} kg")

# Define data source IDs for each metric
DEVICE_INFO = {
    "manufacturer": "unknown",
    "model": "unknown",
    "uid": "1234567890"
}

# These will be set after registration
DATA_SOURCE_ID = None
DATA_SOURCE_ID_HEIGHT = None

if __name__ == '__main__':
    credentials = get_credentials()
    
    # Register all data sources and get their IDs
    print("\nRegistering data sources...")
    weight_id = register_data_source(credentials, None, "com.google.weight", "Weight")
    height_id = register_data_source(credentials, None, "com.google.height", "Height")
    
    if not all([weight_id, height_id]):
        print("Error: Failed to register one or more data sources")
        exit(1)
    
    # Set the data source IDs in the utils module
    set_data_source_ids(weight_id, None, None, None, height_id)
    
    # Insert height (this doesn't change over time)
    insert_height_data(credentials, 1.75)  # 1.75 meters
    
    # Insert concerning health data over the past week
    print("\nInserting concerning health data over the past week...")
    insert_unhealthy_data_points(credentials)
    
    print("\nCurrent health status (most recent readings):")
    print("Height: 1.75 m")
    print("Weight: 95.0 kg (BMI: 31.0 - Obese)")
    
    # Fetch and display the data
    print("\nFetching weight data history:")
    fetch_weight_data(credentials) 