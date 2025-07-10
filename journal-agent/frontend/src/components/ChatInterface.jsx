import React, { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

const ChatInterface = () => {
  const [caption, setCaption] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setCaption('');
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      if (message.type === 'user_transcript') {
        setCaption(message.text);
        setChatHistory(prev => [...prev, { type: 'user', text: message.text }]);
      } else if (message.type === 'agent_response') {
        setChatHistory(prev => [...prev, { type: 'assistant', text: message.text }]);
        setCaption('');
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      setError(`Connection error: ${error.message || 'Unknown error'}`);
    }
  });

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
      // Check if we need microphone permission first
      if (permissionStatus !== 'granted') {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return;
        }
      }
      
      try {
        await conversation.startSession({
          agentId: process.env.REACT_APP_AGENT_ID || 'agent_01jzr6wjqef188s5dr4wd9hczq'
        });
      } catch (err) {
        console.error('Failed to start session:', err);
        setError(`Failed to start call: ${err.message || 'Connection failed'}`);
      }
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      setChatHistory(prev => [...prev, { type: 'user', text: inputText }]);
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

  const isConnected = conversation.status === 'connected';
  const statusText = isConnected ? 'Listening' : 'Ready to call';

  return (
    <div className="chat-interface">
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
  );
};

export default ChatInterface;