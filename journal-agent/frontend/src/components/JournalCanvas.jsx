import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { io } from 'socket.io-client';

const JournalCanvas = ({ chatHistory, conversationId, onHighlightText }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const updateTimer = useRef(null);
  const lastProcessedMessage = useRef(-1);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Debounced update to backend
      clearTimeout(updateTimer.current);
      setIsSaving(true);
      updateTimer.current = setTimeout(() => {
        if (socket && conversationId) {
          socket.emit('journal_update', {
            conversation_id: conversationId,
            content: editor.getHTML()
          });
        }
        setIsSaving(false);
      }, 800);
    },
    editorProps: {
      attributes: {
        class: 'journal-editor-content',
      },
    },
  });

  // Initialize socket connection
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    console.log('Connecting to backend:', backendUrl);
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to journal socket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from journal socket');
      setIsConnected(false);
    });

    newSocket.on('journal_initial', (data) => {
      console.log('Received journal_initial:', data);
      if (data.conversation_id === conversationId && editor) {
        editor.commands.setContent(data.content || '');
        
        // Process existing transcript entries
        if (data.transcript && data.transcript.length > 0) {
          data.transcript.forEach((entry) => {
            appendTranscriptToJournal(entry);
          });
          lastProcessedMessage.current = data.transcript.length - 1;
        }
      }
    });

    newSocket.on('journal_updated', (data) => {
      console.log('Received journal_updated:', data);
      if (data.conversation_id === conversationId && editor) {
        // Apply remote changes without triggering onUpdate
        editor.commands.setContent(data.content, false);
      }
    });

    newSocket.on('transcript_updated', (data) => {
      console.log('Received transcript_updated:', data);
      if (data.conversation_id === conversationId && editor) {
        appendTranscriptToJournal(data.entry);
      }
    });

    return () => {
      console.log('Closing socket connection');
      newSocket.close();
    };
  }, []);

  // Join conversation room when conversationId changes
  useEffect(() => {
    if (socket && conversationId) {
      console.log('Joining conversation room:', conversationId);
      socket.emit('join_conversation', { conversation_id: conversationId });
      lastProcessedMessage.current = -1; // Reset processed message counter
    } else {
      console.log('Cannot join conversation room:', {
        hasSocket: !!socket,
        conversationId
      });
    }
  }, [socket, conversationId]);

  // Helper function to append transcript entries to journal
  const appendTranscriptToJournal = (entry) => {
    if (!editor) return;

    const timestamp = new Date(entry.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const speakerLabel = entry.speaker === 'user' ? 'You' : 'Assistant';
    const speakerClass = entry.speaker === 'user' ? 'transcript-user' : 'transcript-assistant';

    editor.commands.insertContent(`
      <div class="transcript-entry ${speakerClass}">
        <span class="transcript-timestamp">[${timestamp}]</span>
        <span class="transcript-speaker">${speakerLabel}:</span>
        <span class="transcript-text">${entry.text}</span>
      </div>
      <p></p>
    `);

    // Scroll to bottom
    setTimeout(() => {
      const element = document.querySelector('.journal-editor-content');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  };

  // Process new chat history messages
  useEffect(() => {
    console.log('JournalCanvas: chatHistory updated', {
      chatHistoryLength: chatHistory.length,
      lastProcessedMessage: lastProcessedMessage.current,
      conversationId,
      hasSocket: !!socket,
      hasEditor: !!editor
    });

    if (editor && chatHistory.length > lastProcessedMessage.current + 1) {
      const newMessages = chatHistory.slice(lastProcessedMessage.current + 1);
      console.log('Processing new messages:', newMessages);
      
      newMessages.forEach((message) => {
        const timestamp = new Date().toISOString();
        const entry = {
          text: message.text,
          speaker: message.type === 'user' ? 'user' : 'assistant',
          timestamp: timestamp
        };

        console.log('Sending transcript update:', entry);

        // Send to backend for storage and broadcasting
        if (socket && conversationId) {
          socket.emit('transcript_update', {
            conversation_id: conversationId,
            text: message.text,
            speaker: message.type === 'user' ? 'user' : 'assistant'
          });
        } else {
          console.warn('Cannot send transcript update - missing socket or conversationId', {
            hasSocket: !!socket,
            conversationId
          });
        }

        // Append locally as well for immediate feedback
        appendTranscriptToJournal(entry);
      });

      lastProcessedMessage.current = chatHistory.length - 1;
    }
  }, [chatHistory, editor, socket, conversationId]);

  // Handle text selection for AI assistance
  const handleTextSelection = () => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    
    if (selectedText.trim() && onHighlightText) {
      onHighlightText(selectedText);
    }
  };

  // Toolbar functions
  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleHighlight = () => editor.chain().focus().toggleHighlight().run();

  const clearContent = () => {
    if (editor && window.confirm('Are you sure you want to clear the journal?')) {
      editor.commands.clearContent();
    }
  };

  return (
    <div className="journal-canvas">
      <div className="journal-header">
        <div className="journal-title">
          <h2>Journal Entry</h2>
          <div className="journal-status">
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '●' : '○'}
            </span>
            <span className="save-status">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
        </div>
      </div>

      <div className="journal-toolbar">
        <div className="toolbar-group">
          <button 
            className={`toolbar-button ${editor?.isActive('bold') ? 'active' : ''}`}
            onClick={toggleBold}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button 
            className={`toolbar-button ${editor?.isActive('italic') ? 'active' : ''}`}
            onClick={toggleItalic}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button 
            className={`toolbar-button ${editor?.isActive('highlight') ? 'active' : ''}`}
            onClick={toggleHighlight}
            title="Highlight"
          >
            <span style={{ backgroundColor: 'yellow', padding: '2px' }}>H</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            className="toolbar-button ai-assist"
            onClick={handleTextSelection}
            title="Ask ChatGPT about selected text"
          >
            🤖 Ask ChatGPT
          </button>
          <button 
            className="toolbar-button clear-button"
            onClick={clearContent}
            title="Clear journal"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="editor-container">
        <EditorContent 
          editor={editor} 
          className="journal-editor"
          onMouseUp={handleTextSelection}
        />
        {!editor && (
          <div className="editor-placeholder">
            <p>Loading journal editor...</p>
          </div>
        )}
      </div>

      <div className="journal-footer">
        <small>
          {conversationId ? `Conversation: ${conversationId}` : 'No active conversation'}
        </small>
      </div>
    </div>
  );
};

export default JournalCanvas;
