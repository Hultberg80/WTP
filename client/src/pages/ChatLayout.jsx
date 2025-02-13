import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";
import { useParams } from 'react-router-dom';

export default function ChatLayout() {
    const { token } = useParams();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // Uppdaterad useEffect för att ladda data
    useEffect(() => {
        const fetchChatData = async () => {
            if (!token) return;
            
            try {
                const response = await fetch(`/api/formsubmissions/${token}`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("Hämtad data:", data); // Debug log
                    setChatData(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching chat data:', error);
                setLoading(false);
            }
        };

        fetchChatData();
        
        // Sätt upp en interval för att uppdatera data regelbundet
        const interval = setInterval(fetchChatData, 5000); // Uppdatera var 5:e sekund

        // Cleanup funktion
        return () => clearInterval(interval);
    }, [token]); // Beroende av token

    // Resten av din kod förblir samma...
    const handleEmojiClick = (emojiObject) => {
        setMessage(prevMessage => prevMessage + emojiObject.emoji);
        setOpen(false);
    };

    const handleSendMessage = () => {
        if (message.trim() !== "") {
            setMessages(prevMessages => [...prevMessages, message]);
            setMessage("");
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji')) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="p-4">
            <div className="chat-container">
                <h2 className="chat-namn">
                    {loading ? "Laddar..." : chatData?.firstName}
                </h2>

                <div className="messages-container">
                    {loading ? (
                        <p className="loading-message">Laddar chat...</p>
                    ) : (
                        <>
                            {chatData && <p className="loading-message">{chatData.about}</p>}
                            {messages.map((msg, index) => (
                                <div key={index} className="message">{msg}</div>
                            ))}
                        </>
                    )}
                </div>

                <input 
                    id="text-bar" 
                    type="text" 
                    placeholder="message" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSendMessage();
                        }
                    }}
                />

                <div className="emoji" onClick={() => setOpen(!open)}>
                    😃
                </div>

                {open && (
                    <div ref={emojiPickerRef} className="emojipicker">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}

                <button 
                    className="skicka-knapp"
                    onClick={handleSendMessage}
                >
                    Send
                </button>
            </div>
        </div>
    );
}