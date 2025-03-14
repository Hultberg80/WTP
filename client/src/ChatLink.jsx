// Importerar useChat-hooken från ChatContext för att få tillgång till chat-funktionalitet
import { useChat } from './ChatContext';

// Denna komponent ersätter en vanlig <a>-länk för att hantera chat tokens
export default function ChatLink({ chatToken, children, onClick }) { // Tar emot props: chatToken, children (innehållet i länken) och en valfri onClick-handler
  // Hämtar funktionen openChat från chat-contexten
  const { openChat } = useChat();
  
  // Funktion som hanterar klick på länken
  const handleClick = (e) => {
    e.preventDefault(); // Förhindrar standardbeteendet (navigering) för länken
    
    // Om en onClick-handler har skickats med via props, anropa den
    if (onClick && typeof onClick === 'function') {
      onClick();
    }
    
    // Anropar openChat med det angivna chatToken för att öppna chatten
    openChat(chatToken);
  };
  
  // Renderar en <a>-länk med ett href som baseras på chatToken
  // När länken klickas körs handleClick-funktionen
  return (
    <a 
      href={`/chat/${chatToken}`} 
      onClick={handleClick}
    >
      {/* Om children är angivet, renderas det, annars visas standardtexten 'Öppna chatt' */}
      {children || 'Öppna chatt'}
    </a>
  );
}