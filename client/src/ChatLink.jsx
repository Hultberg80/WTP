import { useChat } from './ChatContext';

// This component replaces the regular <a> link for chat tokens
export default function ChatLink({ chatToken, children }) {
  const { openChat } = useChat();
  
  const handleClick = (e) => {
    e.preventDefault(); // Prevent navigation
    openChat(chatToken);
  };
  
  return (
    <a 
      href={`/chat/${chatToken}`} 
      onClick={handleClick}
    >
      {children || 'Öppna chatt'}
    </a>
  );
}