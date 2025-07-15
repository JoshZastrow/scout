from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
import socketio
import json
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel

# Add requests import for API calls
import requests

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# In-memory storage for journal data (replace with database in production)
journal_storage: Dict[str, Dict] = {}

# Create Socket.IO server with proper async configuration
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

# Create FastAPI app
app = FastAPI()

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class JournalUpdate(BaseModel):
    conversation_id: str
    content: str
    timestamp: str

class TranscriptEntry(BaseModel):
    conversation_id: str
    text: str
    speaker: str  # 'user' or 'assistant'
    timestamp: str

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        # enter_room is synchronous in python-socketio
        sio.enter_room(sid, f"conversation_{conversation_id}")
        
        # Send existing journal content if available
        if conversation_id in journal_storage:
            await sio.emit('journal_initial', {
                'conversation_id': conversation_id,
                'content': journal_storage[conversation_id]['content'],
                'transcript': journal_storage[conversation_id].get('transcript', [])
            }, room=sid)
        print(f"Client {sid} joined conversation {conversation_id}")

@sio.event
async def journal_update(sid, data):
    conversation_id = data.get('conversation_id')
    content = data.get('content')
    
    if conversation_id and content is not None:
        # Store journal content
        if conversation_id not in journal_storage:
            journal_storage[conversation_id] = {
                'content': '',
                'transcript': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
        
        journal_storage[conversation_id]['content'] = content
        journal_storage[conversation_id]['updated_at'] = datetime.now().isoformat()
        
        # Broadcast to other clients in the same conversation
        await sio.emit('journal_updated', {
            'conversation_id': conversation_id,
            'content': content
        }, room=f"conversation_{conversation_id}", skip_sid=sid)

@sio.event
async def transcript_update(sid, data):
    conversation_id = data.get('conversation_id')
    text = data.get('text')
    speaker = data.get('speaker')
    
    if conversation_id and text and speaker:
        timestamp = datetime.now().isoformat()
        
        # Initialize storage if needed
        if conversation_id not in journal_storage:
            journal_storage[conversation_id] = {
                'content': '',
                'transcript': [],
                'created_at': timestamp,
                'updated_at': timestamp
            }
        
        # Add transcript entry
        transcript_entry = {
            'text': text,
            'speaker': speaker,
            'timestamp': timestamp
        }
        
        journal_storage[conversation_id]['transcript'].append(transcript_entry)
        journal_storage[conversation_id]['updated_at'] = timestamp
        
        # Broadcast transcript update to all clients in conversation
        await sio.emit('transcript_updated', {
            'conversation_id': conversation_id,
            'entry': transcript_entry
        }, room=f"conversation_{conversation_id}")

# REST API endpoints
@app.post("/api/process")
async def process_input(data: dict):
    response = {
        "message": "Input processed successfully",
        "data": data
    }
    return response

@app.get("/api/journal/{conversation_id}")
async def get_journal(conversation_id: str):
    """Get journal content for a conversation"""
    if conversation_id in journal_storage:
        return journal_storage[conversation_id]
    return {
        'content': '',
        'transcript': [],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

@app.post("/api/journal/{conversation_id}")
async def save_journal(conversation_id: str, update: JournalUpdate):
    """Save journal content"""
    if conversation_id not in journal_storage:
        journal_storage[conversation_id] = {
            'content': '',
            'transcript': [],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
    
    journal_storage[conversation_id]['content'] = update.content
    journal_storage[conversation_id]['updated_at'] = update.timestamp
    
    return {"success": True}

@app.post("/api/transcript/{conversation_id}")
async def add_transcript(conversation_id: str, entry: TranscriptEntry):
    """Add transcript entry"""
    if conversation_id not in journal_storage:
        journal_storage[conversation_id] = {
            'content': '',
            'transcript': [],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
    
    transcript_entry = {
        'text': entry.text,
        'speaker': entry.speaker,
        'timestamp': entry.timestamp
    }
    
    journal_storage[conversation_id]['transcript'].append(transcript_entry)
    journal_storage[conversation_id]['updated_at'] = entry.timestamp
    
    return {"success": True}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Journal backend is running"}

@app.get("/api/conversation-history/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    """Proxy endpoint to fetch conversation history from ElevenLabs API"""
    try:
        # Get API key from environment
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            print("WARNING: ELEVENLABS_API_KEY not found in environment variables")
            return {"error": "ElevenLabs API key not configured", "details": "Please set ELEVENLABS_API_KEY in environment"}
        
        print(f"Fetching conversation history for ID: {conversation_id}")
        print(f"API Key prefix: {api_key[:10]}...")
        
        # Make request to ElevenLabs API
        url = f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}"
        headers = {
            "xi-api-key": api_key,  # ElevenLabs uses xi-api-key header, not Authorization Bearer
            "Content-Type": "application/json"
        }
        
        print(f"Making request to: {url}")
        print(f"Headers: {dict(headers)}")
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"ElevenLabs API response status: {response.status_code}")
        
        if response.status_code == 200:
            conversation_data = response.json()
            print(f"Successfully retrieved conversation data: {len(str(conversation_data))} characters")
            return conversation_data
        elif response.status_code == 404:
            return {"error": "Conversation not found", "conversation_id": conversation_id}
        elif response.status_code == 401:
            error_text = response.text
            print(f"Authentication failed - API key may be invalid: {error_text}")
            return {"error": "Authentication failed - check your ElevenLabs API key", "details": error_text}
        else:
            error_text = response.text
            print(f"ElevenLabs API error: {response.status_code} - {error_text}")
            return {"error": f"Failed to fetch conversation: {response.status_code}", "details": error_text}
            
    except requests.exceptions.Timeout:
        print("Request to ElevenLabs API timed out")
        return {"error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return {"error": f"Request failed: {str(e)}"}
    except Exception as e:
        print(f"Unexpected error fetching conversation history: {e}")
        return {"error": f"Internal server error: {str(e)}"}

# Create the Socket.IO ASGI application
socket_app = socketio.ASGIApp(sio, app)

if __name__ == '__main__':
    uvicorn.run("app:socket_app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=False)