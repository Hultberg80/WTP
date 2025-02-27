// Chat functionality state management

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Initial state
const initialState = {
  chatData: null,
  messages: [],
  message: '',
  loading: true,
  error: null,
  emojiPickerOpen: false
};

// Create context
const ChatContext = createContext(initialState);

// Provider component
export function ChatProvider({ children }) {
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  
  const intervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Fetch chat data based on token - improved with separate API calls and better error handling
  const fetchChatData = useCallback(async (token) => {
    if (!token) return;
    
    try {
      // Only set loading on initial load
      const isInitialLoad = !chatData;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // Split the fetches to handle errors individually
      console.log('Fetching chat data for token:', token);
      
      // Get chat info first
      const chatResponse = await fetch(`/api/chat/${token}`);
      if (!chatResponse.ok) {
        throw new Error(`Failed to fetch chat info: ${chatResponse.status}`);
      }
      
      const chatInfo = await chatResponse.json();
      console.log('Chat info received:', chatInfo);
      
      // Only update chat data if we got valid info
      if (chatInfo) {
        setChatData(chatInfo);
      }
      
      // Now get messages
      const messagesResponse = await fetch(`/api/chat/messages/${token}`);
      if (!messagesResponse.ok) {
        // Don't throw here - we want to preserve chat data even if messages fail
        console.error(`Failed to fetch messages: ${messagesResponse.status}`);
        setError('Kunde inte uppdatera meddelanden. Försök igen senare.');
        return;
      }
      
      const chatMessages = await messagesResponse.json();
      console.log('Messages received:', chatMessages.length);
      
      // Only update messages if we got a valid array
      if (chatMessages && Array.isArray(chatMessages)) {
        setMessages(chatMessages);
        // Clear any existing error if messages were successfully loaded
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching chat data:', err);
      setError(err.message);
      
      // Don't clear existing data on error
    } finally {
      setLoading(false);
    }
  }, [chatData]);

  // Initialize chat with token
  const initializeChat = useCallback((token) => {
    console.log('Initializing chat with token:', token);
    setCurrentToken(token);
    
    // Reset state for new chat
    if (currentToken !== token) {
      setChatData(null);
      setMessages([]);
      setError(null);
      setLoading(true);
    }
    
    // Clear previous interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchChatData(token);
    
    // Set up polling
    intervalRef.current = setInterval(() => {
      console.log('Polling for new messages...');
      fetchChatData(token);
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchChatData, currentToken]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setEmojiPickerOpen(prev => !prev);
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setEmojiPickerOpen(false);
  };

  // Send message - improved with better error handling
  const sendMessage = async () => {
    if (message.trim() === "" || !chatData || !currentToken) return;
    
    // Store message locally before sending
    const currentMessage = message.trim();
    setMessage('');
    
    const messageToSend = {
      chatToken: currentToken,
      sender: chatData.firstName,
      message: currentMessage
    };
    
    // Add temporary message to UI for immediate feedback
    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender: chatData.firstName,
      message: currentMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
  
    try {
      console.log('Sending message:', messageToSend);
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageToSend)
      });
  
      if (!response.ok) {
        throw new Error('Kunde inte skicka meddelande');
      }
  
      // Get response data to confirm message was sent
      const result = await response.json();
      console.log('Message sent successfully:', result);
      
      // Refresh messages
      await fetchChatData(currentToken);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error but don't clear messages
      setError("Kunde inte skicka meddelande. Försök igen.");
    }
  };

  // Debug logging effect for state changes
  useEffect(() => {
    console.log('Chat context state updated:', {
      hasData: !!chatData,
      messageCount: messages.length,
      error,
      loading
    });
  }, [chatData, messages, error, loading]);

  return (
    <ChatContext.Provider
      value={{
        chatData,
        messages,
        message,
        setMessage,
        loading,
        error,
        emojiPickerOpen,
        messagesEndRef,
        emojiPickerRef,
        initializeChat,
        fetchChatData,
        toggleEmojiPicker,
        handleEmojiClick,
        sendMessage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};