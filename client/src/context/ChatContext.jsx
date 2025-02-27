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

  // Fetch chat data based on token
  const fetchChatData = useCallback(async (token) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      const [chatResponse, messagesResponse] = await Promise.all([
        fetch(`/api/chat/${token}`),
        fetch(`/api/chat/messages/${token}`)
      ]);

      if (!chatResponse.ok || !messagesResponse.ok) {
        throw new Error('Kunde inte hämta chattdata');
      }

      const [chatInfo, chatMessages] = await Promise.all([
        chatResponse.json(),
        messagesResponse.json()
      ]);
      
      setChatData(chatInfo);
      setMessages(chatMessages);
      setError(null);
    } catch (err) {
      console.error('Error fetching chat data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize chat with token
  const initializeChat = useCallback((token) => {
    console.log('Initializing chat with token:', token);
    setCurrentToken(token);
    
    // Clear previous interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchChatData(token);
    
    // Set up polling
    intervalRef.current = setInterval(() => fetchChatData(token), 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchChatData]);

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

  // Send message
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
  
      // Refresh messages
      await fetchChatData(currentToken);
    } catch (error) {
      console.error('Error sending message:', error);
      setError("Kunde inte skicka meddelande. Försök igen.");
    }
  };

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