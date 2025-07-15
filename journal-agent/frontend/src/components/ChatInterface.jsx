import React, { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import JournalCanvas from './JournalCanvas';

const ChatInterface = () => {
  const [caption, setCaption] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [conversationId, setConversationId] = useState(null);
  const [highlightedText, setHighlightedText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pollingAttempt, setPollingAttempt] = useState(0);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setError(''); // Clear any connection errors
    },
    onDisconnect: async () => {
      console.log('Disconnected from ElevenLabs');
      setCaption('');
      
      // Fetch conversation history when call ends
      if (conversationId) {
        // Start polling after a short delay to allow ElevenLabs to begin processing
        console.log('Starting conversation history polling in 2 seconds...');
        setTimeout(async () => {
          await fetchAndSaveConversationHistory(conversationId);
        }, 2000);
      }
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      
      // Check if this message contains a conversation ID
      if (message.conversation_id) {
        console.log('ElevenLabs conversation ID received:', message.conversation_id);
        setConversationId(message.conversation_id);
      }
      
      // Only handle real-time captions and audio events
      if (message.type === 'user_transcript') {
        const transcript = message.user_transcription_event?.user_transcript || message.user_transcript || message.text;
        if (transcript) {
          setCaption(transcript);
        }
      } else if (message.type === 'agent_response') {
        setCaption(''); // Clear caption when agent responds
      } else if (message.type === 'audio') {
        console.log('Audio event received:', message.audio_event?.event_id);
      } else if (message.type === 'vad_score') {
        console.log('VAD Score:', message.vad_score_event?.vad_score);
      } else {
        console.log('Unhandled message type:', message.type, message);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      setError(`Connection error: ${error.message || 'Unknown error'}`);
    }
  });

  // Function to poll for conversation history with time-based retries
  const pollConversationHistory = async (conversationId, maxAttempts = 10, delay = 2000) => {
    return new Promise((resolve, reject) => {
      let attempt = 0;

      const tryFetch = async () => {
        attempt++;
        setPollingAttempt(attempt);
        console.log(`Polling attempt ${attempt}/${maxAttempts} for conversation: ${conversationId}`);
        
        try {
          const historyData = await fetchConversationHistory(conversationId);
          
          console.log('Polling result for attempt', attempt, ':', {
            hasData: !!historyData,
            hasError: !!(historyData && historyData.error),
            dataKeys: historyData ? Object.keys(historyData) : 'none'
          });
          
          // Check if we got valid conversation data
          if (historyData && !historyData.error) {
            // Also check if we have any actual conversation content
            const hasConversationContent = 
              (historyData.conversation && Array.isArray(historyData.conversation) && historyData.conversation.length > 0) ||
              (historyData.transcript && Array.isArray(historyData.transcript) && historyData.transcript.length > 0) ||
              (historyData.turns && Array.isArray(historyData.turns) && historyData.turns.length > 0) ||
              (historyData.messages && Array.isArray(historyData.messages) && historyData.messages.length > 0) ||
              historyData.analysis;
            
            if (hasConversationContent) {
              console.log('Successfully retrieved conversation history with content on attempt', attempt);
              setPollingAttempt(0); // Reset attempt counter
              resolve(historyData);
              return;
            } else {
              console.log(`Attempt ${attempt}: Got response but no conversation content yet`);
              if (attempt < maxAttempts) {
                console.log(`Retrying in ${delay/1000} seconds...`);
                setTimeout(tryFetch, delay);
                return;
              } else {
                console.log('Max attempts reached, returning data anyway');
                setPollingAttempt(0);
                resolve(historyData); // Return whatever we got
                return;
              }
            }
          } else if (historyData && historyData.error) {
            console.log(`Attempt ${attempt} failed:`, historyData.error);
            
            // If it's a "not found" error, continue polling
            if (historyData.error.includes('not found') || historyData.error.includes('404')) {
              if (attempt < maxAttempts) {
                console.log(`Conversation not ready yet, retrying in ${delay/1000} seconds...`);
                setTimeout(tryFetch, delay);
                return;
              } else {
                setPollingAttempt(0);
                reject(new Error(`Failed to retrieve conversation history after ${maxAttempts} attempts`));
                return;
              }
            } else {
              // For other errors (auth, etc.), don't continue polling
              setPollingAttempt(0);
              reject(new Error(historyData.error));
              return;
            }
          }
        } catch (error) {
          console.error(`Polling attempt ${attempt} failed:`, error);
          
          if (attempt < maxAttempts) {
            console.log(`Retrying in ${delay/1000} seconds...`);
            setTimeout(tryFetch, delay);
          } else {
            setPollingAttempt(0);
            reject(new Error(`Failed to retrieve conversation history after ${maxAttempts} attempts: ${error.message}`));
          }
        }
      };

      // Start the first attempt
      tryFetch();
    });
  };
  const fetchConversationHistory = async (conversationId) => {
    try {
      // Since we can't expose API keys in frontend, we'll proxy through our backend
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/conversation-history/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to fetch conversation history: ${response.statusText}`);
      }

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      console.log('Conversation history received:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  };

  // Function to process conversation history and save to journal
  const fetchAndSaveConversationHistory = async (conversationId) => {
    try {
      setIsLoadingHistory(true);
      setPollingAttempt(0);
      console.log('Starting conversation history retrieval for:', conversationId);
      
      // Use polling instead of single fetch - 8 attempts, 2 seconds apart  
      const historyData = await pollConversationHistory(conversationId, 8, 2000);
      
      console.log('Raw conversation history response:', historyData);
      console.log('Data type:', typeof historyData);
      console.log('Data keys:', historyData ? Object.keys(historyData) : 'No data');
      
      const formattedHistory = [];
      
      // Handle different possible response structures from ElevenLabs
      if (historyData) {
        // Check for direct conversation array
        if (historyData.conversation && Array.isArray(historyData.conversation)) {
          historyData.conversation.forEach(turn => {
            if (turn.user_input) {
              formattedHistory.push({
                type: 'user',
                text: turn.user_input,
                timestamp: turn.timestamp || new Date().toISOString()
              });
            }
            if (turn.agent_response) {
              formattedHistory.push({
                type: 'assistant',
                text: turn.agent_response,
                timestamp: turn.timestamp || new Date().toISOString()
              });
            }
          });
        }
        
        // Check for analysis with conversation data
        else if (historyData.analysis) {
          if (historyData.analysis.conversation_summary) {
            formattedHistory.push({
              type: 'assistant',
              text: `Conversation Summary: ${historyData.analysis.conversation_summary}`,
              timestamp: new Date().toISOString()
            });
          }
          
          // If the API provides conversation turns/messages directly
          if (historyData.conversation && historyData.conversation.turns) {
            historyData.conversation.turns.forEach(turn => {
              if (turn.user_message) {
                formattedHistory.push({
                  type: 'user',
                  text: turn.user_message,
                  timestamp: turn.timestamp || new Date().toISOString()
                });
              }
              if (turn.agent_message) {
                formattedHistory.push({
                  type: 'assistant',
                  text: turn.agent_message,
                  timestamp: turn.timestamp || new Date().toISOString()
                });
              }
            });
          }
        }
        
        // Check for turns array
        else if (historyData.turns && Array.isArray(historyData.turns)) {
          historyData.turns.forEach(turn => {
            if (turn.user_message || turn.user_input) {
              formattedHistory.push({
                type: 'user',
                text: turn.user_message || turn.user_input,
                timestamp: turn.timestamp || new Date().toISOString()
              });
            }
            if (turn.agent_message || turn.agent_response) {
              formattedHistory.push({
                type: 'assistant',
                text: turn.agent_message || turn.agent_response,
                timestamp: turn.timestamp || new Date().toISOString()
              });
            }
          });
        }
        
        // Check for messages array
        else if (historyData.messages && Array.isArray(historyData.messages)) {
          historyData.messages.forEach(message => {
            const messageType = message.role === 'user' ? 'user' : 'assistant';
            formattedHistory.push({
              type: messageType,
              text: message.content || message.text || message.message,
              timestamp: message.timestamp || new Date().toISOString()
            });
          });
        }
        
        // Check for transcript field (specific to ElevenLabs)
        else if (historyData.transcript && Array.isArray(historyData.transcript)) {
          console.log(`Processing transcript with ${historyData.transcript.length} entries`);
          
          historyData.transcript.forEach((entry, index) => {
            console.log(`Transcript entry ${index}:`, entry);
            
            // Handle ElevenLabs transcript entry structure: role + message
            if (entry && typeof entry === 'object' && entry.role && entry.message) {
              const speaker = entry.role === 'user' ? 'user' : 'assistant';
              formattedHistory.push({
                type: speaker,
                text: entry.message,
                timestamp: entry.timestamp || new Date().toISOString()
              });
            }
            // Fallback for other possible structures
            else if (entry && typeof entry === 'object') {
              let speaker = null;
              let text = null;
              
              // Check for speaker/text fields
              if (entry.speaker && entry.text) {
                speaker = entry.speaker === 'user' ? 'user' : 'assistant';
                text = entry.text;
              }
              // Check for content field
              else if (entry.content) {
                speaker = entry.role === 'user' ? 'user' : 'assistant';
                text = entry.content;
              }
              
              if (speaker && text) {
                formattedHistory.push({
                  type: speaker,
                  text: text,
                  timestamp: entry.timestamp || new Date().toISOString()
                });
              } else {
                console.log(`Could not parse transcript entry ${index}:`, entry);
              }
            }
          });
        }
        
        // If no structured data found, create a summary entry
        else {
          formattedHistory.push({
            type: 'assistant',
            text: `Conversation data retrieved for ID: ${conversationId}. Check console for raw data structure.`,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log('Formatted conversation history:', formattedHistory);
      console.log('Formatted history length:', formattedHistory.length);
      console.log('History data structure check:');
      console.log('- Has conversation array?', historyData?.conversation && Array.isArray(historyData.conversation));
      console.log('- Has analysis?', !!historyData?.analysis);
      console.log('- Has turns array?', historyData?.turns && Array.isArray(historyData.turns));
      console.log('- Has messages array?', historyData?.messages && Array.isArray(historyData.messages));
      console.log('- Has transcript array?', historyData?.transcript && Array.isArray(historyData.transcript));
      
      if (formattedHistory.length > 0) {
        // Update chat history state
        setChatHistory(formattedHistory);
      } else {
        console.log('No conversation history found in response');
        setError('No conversation content found - the conversation may have been too short or not processed yet');
      }
      
    } catch (error) {
      console.error('Failed to fetch and save conversation history:', error);
      setError(`Failed to load conversation history: ${error.message}`);
    } finally {
      setIsLoadingHistory(false);
      setPollingAttempt(0);
    }
  };

  // Check microphone permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        setPermissionStatus(result.state);
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
        });
      } catch (err) {
        console.warn('Permission check failed:', err);
      }
    };
    
    checkPermissions();
  }, []);

  // Debug logging for chatHistory changes
  useEffect(() => {
    console.log('ChatInterface: chatHistory updated', {
      length: chatHistory.length,
      conversationId,
      messages: chatHistory.map(msg => ({ type: msg.type, text: msg.text.substring(0, 50) + '...' }))
    });
  }, [chatHistory, conversationId]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just wanted to trigger permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      setError('');
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError('Microphone access denied. Please allow microphone access and try again.');
      setPermissionStatus('denied');
      return false;
    }
  };

  const handleCallToggle = async () => {
    setError(''); // Clear any previous errors
    
    if (conversation.status === 'connected') {
      await conversation.endSession();
    } else {
      // Generate a new conversation ID if starting
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setConversationId(currentConversationId);
        console.log('Generated conversation ID:', currentConversationId);
      }
      
      // Clear previous chat history when starting new conversation
      setChatHistory([]);
      setCaption('');
      
      // Check if we need microphone permission first
      if (permissionStatus !== 'granted') {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return;
        }
      }
      
      try {
        console.log('Starting session with agent ID:', process.env.REACT_APP_AGENT_ID);
        const sessionId = await conversation.startSession({
          agentId: process.env.REACT_APP_AGENT_ID || 'agent_01jzr6wjqef188s5dr4wd9hczq'
        });
        
        console.log('Session started successfully with ID:', sessionId);
        
        // Update conversation ID with the actual session ID if provided
        if (sessionId && typeof sessionId === 'string') {
          setConversationId(sessionId);
          console.log('Updated conversation ID to session ID:', sessionId);
        }
      } catch (err) {
        console.error('Failed to start session:', err);
        setError(`Failed to start call: ${err.message || 'Connection failed'}`);
      }
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      setChatHistory(prev => [...prev, { 
        type: 'user', 
        text: inputText,
        timestamp: new Date().toISOString()
      }]);
      // Here you would send the message to your backend or ElevenLabs
      setInputText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleHighlightText = (text) => {
    setHighlightedText(text);
    // You can add logic here to send highlighted text to AI for analysis
    console.log('Highlighted text:', text);
  };

  const isConnected = conversation.status === 'connected';
  const statusText = isConnected ? 'Listening' : 'Ready to call';

  return (
    <div className="chat-container">
      <div className="chat-panel">
        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
            {permissionStatus === 'denied' && (
              <div className="permission-help">
                <p>To enable microphone access:</p>
                <ul>
                  <li>Click the microphone icon in your browser's address bar</li>
                  <li>Select "Allow" for microphone permissions</li>
                  <li>Refresh the page and try again</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Animated Circle with Status */}
        <div className="voice-circle-container">
          <div className={`voice-circle ${isConnected ? 'active' : ''}`}>
            <div className="voice-status">{statusText}</div>
          </div>
        </div>

        {/* Floating Call Button */}
        <button 
          className={`floating-call-button ${isConnected ? 'active' : ''}`}
          onClick={handleCallToggle}
        >
          <span className={isConnected ? 'icon-phone-off' : 'icon-phone'}></span>
        </button>

        {/* Live Caption */}
        {caption && (
          <div className="live-caption">
            {caption}
          </div>
        )}

        {/* Loading State */}
        {isLoadingHistory && (
          <div className="live-caption" style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>
            {pollingAttempt > 0 
              ? `Retrieving conversation history... (attempt ${pollingAttempt})`
              : 'Retrieving conversation history...'
            }
          </div>
        )}

        {/* Temporary test button for debugging */}
        <div style={{ margin: '10px', textAlign: 'center' }}>
          <button 
            onClick={() => fetchAndSaveConversationHistory('conv_01k05pn2z2ejhbpyqmm9wk8pkr')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Load Conversation History
          </button>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="chat-history">
            {chatHistory.map((message, index) => (
              <div key={index} className={`chat-message ${message.type}`}>
                {message.text}
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="input-container">
          <div className="input-area">
            <button className="attachment-button">
              <span className="icon-paperclip"></span>
            </button>
            
            <input
              type="text"
              className="text-input"
              placeholder="Ask anything"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            
            <div className="input-buttons">
              <button className="mic-button">
                <span className="icon-mic"></span>
              </button>
              <button 
                className="send-button"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <span className="icon-send"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="journal-panel">
        <JournalCanvas 
          chatHistory={chatHistory}
          conversationId={conversationId}
          onHighlightText={handleHighlightText}
        />
      </div>
    </div>
  );
};

export default ChatInterface;