import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";
import Chat from "./Chat";

export default function ChatLayout() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // Hantera klick utanför emoji-pickern för att stänga den
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji')) {
                setOpen(false); // Stäng emoji-pickern när du klickar utanför
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Lägg till emoji-val till message-baren och stänger emoji-pickern efter
    const handleEmojiClick = (emoji) => {
        setMessage(prevMessage => prevMessage + emoji.emoji);
        setOpen(true);
    };

    // Skicka meddelandet 
    const handleSendMessage = () => {
        if (message.trim() !== "") {
            // Lägg till meddelandet i listan av meddelanden och skicka som användarens meddelande
            setMessages(prevMessages => [...prevMessages, { text: message, sender: 'user' }]);

            // Simulera ett svar från den andra personen efter en kort fördröjning
            setTimeout(() => {
                setMessages(prevMessages => [...prevMessages, { text: "Svar från kunden", sender: 'kund' }]);
            }, 1000);
        }
        setMessage(""); 
    };

    return (
        <>
            <h1>hejsan123</h1>
            <div className="chat-container">
                <h2 className='chat-namn'>namn här</h2>

               
                <div className="messages-container">
                    {/* Laddningsmeddelande */}
                    {loading && <p className="loading-message">Laddar chat...</p>}

                    {/* Lista av meddelanden */}
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>{msg.text}</div>
                    ))}
                </div>

                <input 
                    id="text-bar" 
                    type="text" 
                    placeholder="message" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />

                <div className="emoji" onClick={() => setOpen(!open)}>
                    😃
                </div>

                {open && (
                    <div ref={emojiPickerRef} className="emojipicker">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}

                <button className="skicka-knapp" onClick={handleSendMessage}>Send</button>
            </div>
        </>
    );
}
