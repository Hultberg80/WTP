// Importerar createContext, useState och useContext från React för att skapa och använda Context
import { createContext, useState, useContext } from 'react';
// Importerar ChatModal-komponenten som kommer att visas när chatten är öppen
import ChatModal from './ChatModal';

// Skapar ett nytt context-objekt för chat-funktionaliteten
const ChatContext = createContext();

// Skapar en provider-komponent som omsluter delar av applikationen som behöver chat-funktionalitet
export function ChatProvider({ children }) {
  // State för att hantera om chat-modal är öppen (true/false)
  const [modalOpen, setModalOpen] = useState(false);
  // State för att lagra det aktuella chat-token som identifierar chatten
  const [chatToken, setChatToken] = useState(null);

  // Funktion för att öppna chatten med ett specifikt token
  const openChat = (token) => {
    setChatToken(token);   // Sätter chatToken med det angivna token
    setModalOpen(true);      // Öppnar chat-modal genom att sätta modalOpen till true
  };

  // Funktion för att stänga chatten
  const closeChat = () => {
    setModalOpen(false); // Stänger chat-modal genom att sätta modalOpen till false
    // Väntar 300 millisekunder innan chatToken återställs till null,
    // för att undvika "flickering" under modalens stängningsanimation
    setTimeout(() => setChatToken(null), 300);
  };

  // Returnerar provider-komponenten som omsluter barn-komponenterna
  // Inom ChatContext.Provider skickas openChat som värde till contextet
  // Samtidigt renderas ChatModal med props för att styra om den ska visas
  // och vilket token som ska användas
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

// Skapar en custom hook för att enkelt använda ChatContext i andra komponenter
export function useChat() {
  // Hämtar contextet med useContext-hooken
  const context = useContext(ChatContext);
  // Om contextet är undefined (vilket betyder att useChat inte används inom en ChatProvider),
  // kasta ett fel
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  // Returnera det hämtade context-värdet
  return context;
}