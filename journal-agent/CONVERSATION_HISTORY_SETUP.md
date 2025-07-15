# Journal Agent - Conversation History Setup

This application automatically fetches conversation transcripts from ElevenLabs after each call ends and writes them to the Journal Canvas.

## Setup Instructions

### 1. ElevenLabs API Key Configuration

To fetch conversation history, you need to configure your ElevenLabs API key:

1. Get your API key from [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)

2. Set the environment variable in the backend:
   ```bash
   # Edit backend/.env file
   ELEVENLABS_API_KEY=your_actual_api_key_here
   ```

   **Important**: ElevenLabs API keys can have different formats:
   - Some start with `sk_` (like OpenAI keys)
   - Others are hex strings without prefixes
   - Make sure to copy the exact key from your ElevenLabs dashboard

3. Restart the backend server for changes to take effect

### 2. How It Works

1. **Start Conversation**: Click the phone button to start a voice conversation with the AI agent
2. **Talk Naturally**: Speak with the AI agent as normal - you'll see live captions
3. **End Conversation**: Click the phone button again to end the call
4. **Automatic History Retrieval**: After a 3-second delay, the app automatically fetches the complete conversation transcript from ElevenLabs
5. **Journal Update**: The transcript is written to the Journal Canvas on the right

### 3. Authentication Fix

The backend now uses the correct ElevenLabs API authentication:
- Uses `xi-api-key` header instead of `Authorization: Bearer`
- Handles different API key formats
- Provides better error messages for authentication issues

### 4. Troubleshooting

If conversation history doesn't load:

1. **Check API Key**: 
   - Ensure `ELEVENLABS_API_KEY` is set correctly in `backend/.env`
   - Verify the key is copied exactly from ElevenLabs dashboard
   - Check backend logs for "Authentication failed" errors

2. **Check Conversation ID**: 
   - The conversation ID should be logged in the browser console
   - Make sure the conversation actually completed successfully

3. **Check Backend Logs**: 
   - Look for API response status codes
   - 401 errors indicate API key issues
   - 404 errors indicate conversation not found

4. **API Permissions**: 
   - Ensure your ElevenLabs account has access to the Conversational AI API
   - Some features may require a paid subscription

### 5. Development Notes

- No manual buttons - everything happens automatically when you end the call
- 3-second delay allows ElevenLabs to process the conversation before retrieval
- Complete conversation transcript appears in the Journal Canvas
- Backend logs show detailed API request/response information for debugging
