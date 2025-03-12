import { useChat } from './ChatContext';

// This component replaces the regular <a> link for chat tokens
export default function ChatLink({ chatToken, children, onClick }) {
  const { openChat } = useChat();
  
  const handleClick = (e) => {
    e.preventDefault(); // Prevent navigation
    
    // Call the passed onClick handler if provided
    if (onClick) {
      onClick();
    }
    
    // Open the chat
    openChat(chatToken);
  };
  
  return (
    <a 
      href={`/chat/${chatToken}`} 
      onClick={handleClick}
      className="chat-link"
    >
      {children || 'Öppna chatt'}
    </a>
  );
}