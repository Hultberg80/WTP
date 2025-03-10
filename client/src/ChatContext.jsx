import { createContext, useState, useContext } from 'react';
import ChatModal from './ChatModal';

// Create a context for the chat functionality
const ChatContext = createContext();

// Create a provider component
export function ChatProvider({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [chatToken, setChatToken] = useState(null);

  const openChat = (token) => {
    setChatToken(token);
    setModalOpen(true);
  };

  const closeChat = () => {
    setModalOpen(false);
    // Don't reset the token immediately to avoid flickering during modal close animation
    setTimeout(() => setChatToken(null), 300);
  };

  return (
    <ChatContext.Provider value={{ openChat }}>
      {children}
      <ChatModal 
        isOpen={modalOpen} 
        onClose={closeChat} 
        chatToken={chatToken} 
      />
    </ChatContext.Provider>
  );
}

// Custom hook to use the chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}