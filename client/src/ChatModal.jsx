// Importerar React hooks: useState för state-hantering, useEffect för sidoeffekter och useRef för DOM-referenser
import { useState, useEffect, useRef } from 'react';
// Importerar EmojiPicker-komponenten som används för att välja emojis
import EmojiPicker from "emoji-picker-react";

// Definierar ChatModal-komponenten som tar emot props: isOpen (om modalen är öppen), onClose (funktion för att stänga modalen) och chatToken (unik identifierare för chatten)
export default function ChatModal({ isOpen, onClose, chatToken }) {
    // Definierar state för meddelandeinmatningsfältet
    const [message, setMessage] = useState(""); 
    // State för listan med chattmeddelanden
    const [messages, setMessages] = useState([]);
    // State för chatägarens namn (första meddelandets avsändare)
    const [chatOwner, setChatOwner] = useState(null);
    // State för användarens namn (hämtas vid inloggning eller sätts till chatOwner)
    const [userName, setUserName] = useState(null);
    // State för att avgöra om emoji-pickern ska visas
    const [open, setOpen] = useState(false);
    // Referens till emoji-pickerns DOM-element (används för att hantera klick utanför)
    const emojiPickerRef = useRef(null);
    // State för att hantera laddningstillstånd (visas t.ex. som en skelettvy)
    const [loading, setLoading] = useState(true);
    // State för att lagra eventuella felmeddelanden
    const [error, setError] = useState(null);
    // Referens som används för att scrolla till botten av meddelandelistan
    const messagesEndRef = useRef(null);
    // Referens för att lagra polling-intervallet (så att det kan rensas vid behov)
    const intervalRef = useRef(null);
    // Referens till modaldialogens DOM-element (kan användas vid ut-och-in-klick)
    const modalRef = useRef(null);

    // useEffect för att kontrollera autentiseringsstatus när komponenten mountas
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                // Hämtar autentiseringsstatus från API:t med credentials inkluderade (för session)
                const response = await fetch('/api/chat/auth-status', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    // Om svaret är OK, konvertera svaret till JSON
                    const data = await response.json();
                    
                    // Om användaren är inloggad och har ett firstName, sätt userName med det värdet
                    if (data.isLoggedIn && data.firstName) {
                        setUserName(data.firstName);
                        console.log(`User is logged in as: ${data.firstName}`);
                    }
                }
            } catch (err) {
                console.error('Error checking auth status:', err);
            }
        };
        
        // Anropa funktionen för att kontrollera auth-status
        checkAuthStatus();
    }, []); // Körs endast en gång vid komponentens initiala rendering

    // Funktion för att hämta chattmeddelanden från API:t
    const fetchMessages = async () => {
        // Om chatToken saknas, avbryt funktionen
        if (!chatToken) return;

        try {
            // Skicka en GET-förfrågan till API:t för att hämta meddelanden för den aktuella chatToken
            const response = await fetch(`/api/chat/messages/${chatToken}`, {
                credentials: 'include' // Inkludera credentials för att hantera sessionen
            });

            // Om svaret inte är OK, kasta ett fel
            if (!response.ok) {
                throw new Error(`Kunde inte hämta chatmeddelanden: ${response.status}`);
            }
            
            // Konvertera svaret till JSON
            const data = await response.json();
            
            // Uppdatera state med de mottagna meddelandena
            setMessages(data.messages);
            
            // Om ett chatOwner returneras och det inte redan är satt, uppdatera chatOwner
            if (data.chatOwner && !chatOwner) {
                setChatOwner(data.chatOwner);
                
                // Om userName inte är satt än, använd chatOwner som användarnamn
                if (!userName) {
                    setUserName(data.chatOwner);
                    console.log(`Setting username to first message sender: ${data.chatOwner}`);
                }
            }
            
            // Rensa eventuella tidigare fel
            setError(null);
        } catch (err) {
            console.error('Error fetching messages:', err);
            // Spara felmeddelandet i state
            setError(err.message);
        } finally {
            // Avsluta laddningstillståndet
            setLoading(false);
        }
    };

    // useEffect för att sätta upp initial hämtning och polling av meddelanden när modalen öppnas
    useEffect(() => {
        if (isOpen && chatToken) {
            console.log('Setting up chat with token:', chatToken);
            setLoading(true); // Sätt laddningstillståndet till true
            
            // Hämta meddelanden direkt
            fetchMessages();

            // Om ett tidigare intervall finns, rensa det
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            // Sätt upp ett polling-intervall som hämtar meddelanden var 5:e sekund
            intervalRef.current = setInterval(fetchMessages, 5000);
        }

        // Rensa polling-intervallet när modalen stängs eller komponenten avmonteras
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isOpen, chatToken]); // Körs när isOpen eller chatToken ändras

    // useEffect för att scrolla till botten av meddelandelistan när nya meddelanden läggs till
    useEffect(() => {
        // Använder referensen för att scrolla in i vyn med smooth beteende
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]); // Körs varje gång messages ändras

    // useEffect för att stänga emoji-pickern när man klickar utanför den
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Om emojiPickerRef finns och klicket inte är inom den, samt inte är ett element med klassen "emoji"
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                !event.target.closest(".emoji")
            ) {
                setOpen(false); // Stäng emoji-pickern
            }
        };

        // Lägg till en eventlyssnare för "mousedown" på dokumentet
        document.addEventListener("mousedown", handleClickOutside);
        // Rensa lyssnaren vid cleanup
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Funktion för att hantera skickande av ett nytt meddelande
    const handleSendMessage = async () => {
        // Om meddelandet är tomt eller om användarnamn inte är satt, gör inget
        if (message.trim() === "" || !userName) return;
        
        // Trimma meddelandetexten och spara det i en variabel
        const currentMessage = message.trim();
        
        // Rensa inmatningsfältet för bättre användarupplevelse
        setMessage("");
        
        // Skapa ett objekt med meddelandedata att skicka till servern
        const messageToSend = {
            chatToken: chatToken,
            sender: userName,
            message: currentMessage
            // Tidsstämpel kommer att hanteras av servern
        };
        
        // Skapa ett temporärt meddelandeobjekt för att ge omedelbar feedback i UI:t
        const tempMessage = {
            id: `temp-${Date.now()}`, // Generera ett tillfälligt ID baserat på tidsstämpel
            sender: userName,
            message: currentMessage,
            timestamp: new Date().toISOString(),
            chatToken: chatToken
        };
        // Lägg till det temporära meddelandet i listan med meddelanden
        setMessages(prev => [...prev, tempMessage]);
    
        try {
            console.log('Sending message:', messageToSend);
            // Skicka meddelandet till API:t med POST-metoden, inklusive nödvändiga headers och credentials
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageToSend),
                credentials: 'include' // Viktigt: inkludera credentials för att hantera sessionen
            });
    
            // Om svaret inte är OK, kasta ett fel
            if (!response.ok) {
                throw new Error('Kunde inte skicka meddelande');
            }
    
            // Läs serverns svar med det sparade meddelandet
            const result = await response.json();
            console.log('Message sent successfully:', result);
            
            // Uppdatera meddelandelistan genom att hämta meddelanden igen, för att få officiell tidsstämpel från servern
            await fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            // Sätt felmeddelande vid misslyckat försök att skicka meddelande
            setError("Kunde inte skicka meddelande. Försök igen.");
        }
    };

    // Funktion för att hantera val av emoji från EmojiPicker
    const handleEmojiClick = (emojiObject) => {
        // Lägg till den valda emojin i den aktuella meddelandetexten
        setMessage(prev => prev + emojiObject.emoji);
        // Stäng emoji-pickern
        setOpen(false);
    };

    // Om modalen inte är öppen, rendera inte komponenten
    if (!isOpen) return null;

    // Om data fortfarande laddas, visa en skelettvy (loading skeleton)
    if (loading) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__header">
                        <div className="chat-modal__header-skeleton"></div>
                        <button className="chat-modal__close" onClick={onClose}>&times;</button>
                    </div>
                    <div className="chat-modal__messages">
                        <div className="chat-modal__messages-loading">
                            <div className="chat-modal__message-skeleton"></div>
                            <div className="chat-modal__message-skeleton chat-modal__message-skeleton--right"></div>
                            <div className="chat-modal__message-skeleton"></div>
                        </div>
                    </div>
                    <div className="chat-modal__input-container">
                        <div className="chat-modal__input-skeleton"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Om ett fel uppstått, visa en felvy med möjlighet att försöka igen
    if (error) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__header">
                        <h2 className="chat-modal__name">Error</h2>
                        <button className="chat-modal__close" onClick={onClose}>&times;</button>
                    </div>
                    <div className="chat-modal__error">
                        <p>{error}</p>
                        <button 
                            onClick={fetchMessages}
                            className="chat-modal__error-button"
                        >
                            Försök igen
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    

    // Renderar huvudsakliga chat-UI:t
    return (
        <div className="chat-modal" ref={modalRef}>
            <div className="chat-modal__container">
                {/* Header med chattens namn (chatOwner om definierad, annars "Chat") och en stäng-knapp */}
                <div className="chat-modal__header">
                    <h2 className="chat-modal__name">
                        {chatOwner || "Chat"}
                    </h2>
                    <button 
                        className="chat-modal__close" 
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                
                {/* Meddelandeområdet */}
                <div className="chat-modal__messages">
                    {messages.length === 0 ? (
                        // Om inga meddelanden finns, visa en tom vy
                        <div className="chat-modal__empty">
                            Inga meddelanden än
                        </div>
                    ) : (
                        // Mappa igenom meddelandelistan och rendera varje meddelande
                        messages.map((msg) => (
                            <div 
                                key={msg.id}
                                className={`chat-modal__message ${
                                    // Tilldela CSS-klass baserat på om meddelandet skickades av den inloggade användaren
                                    msg.sender === userName 
                                        ? 'chat-modal__message--sent' 
                                        : 'chat-modal__message--received'
                                }`}
                            >
                                <p className="chat-modal-sender">{msg.sender}</p>
                                <p className="chat-modal__message-text">{msg.message}</p>
                                
                                <small className="chat-modal__message-timestamp">
                                    {new Date(msg.timestamp).toLocaleString()}
                                </small>
                            </div>
                        ))
                    )}
                    {/* Referens för att scrolla till botten av meddelandelistan */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Inmatningsområdet för nya meddelanden */}
                <div className="chat-modal__input-container">
                    <input 
                        type="text" 
                        className="chat-modal__input-field"
                        placeholder="Skriv ett meddelande..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                            // Om Enter trycks, skicka meddelandet
                            if (e.key === 'Enter') {
                                handleSendMessage();
                            }
                        }}
                    />

                    {/* Emoji-ikon som växlar emoji-pickern */}
                    <div className="emoji" onClick={() => setOpen(!open)}>😃
                    </div>
                    {/* Rendera EmojiPicker om "open" är true */}
                    {open && (
                        <div ref={emojiPickerRef} className="emojipicker">
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                    )}

                    {/* Skicka-knapp */}
                    <button 
                        className="chat-modal__send-button" 
                        onClick={handleSendMessage}
                        type="button"
                    >
                        Skicka
                    </button>
                </div>
            </div>
        </div>
    );
}