import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";

export default function Chat() {
    const { token } = useParams();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // Fetch both initial message and chat messages
    const fetchChatData = useCallback(async () => {
        if (!token) {
            setError("Ingen token tillgänglig");
            setLoading(false);
            return;
        }

        try {
            // Fetch initial chat info from DynamicMessages
            const chatResponse = await fetch(`/api/chat/${token}`);
            if (!chatResponse.ok) {
                throw new Error('Could not fetch chat info');
            }
            const chatInfo = await chatResponse.json();
            setChatData(chatInfo);

            // Fetch chat messages
            const messagesResponse = await fetch(`/api/chat/messages/${token}`);
            if (!messagesResponse.ok) {
                throw new Error('Could not fetch messages');
            }
            const chatMessages = await messagesResponse.json();
            setMessages(chatMessages);
            
            setError(null);
        } catch (error) {
            console.error('Error:', error);
            setError(`Ett fel uppstod: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Initial and continuous data fetching
    useEffect(() => {
        fetchChatData();
        const intervalId = setInterval(fetchChatData, 2000);
        return () => clearInterval(intervalId);
    }, [fetchChatData]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send message handler
    const handleSendMessage = async () => {
        if (message.trim() === "") return;

        try {
            const newMessage = {
                chatToken: token,
                sender: 'Agent',
                message: message,
                timestamp: new Date().toISOString()
            };
            
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newMessage)
            });

            if (response.ok) {
                setMessage("");
                await fetchChatData();
            } else {
                throw new Error('Kunde inte skicka meddelande');
            }
        } catch (error) {
            console.error("Kunde inte skicka meddelande:", error);
        }
    };

    // Emoji handler
    const handleEmojiClick = (emojiObject) => {
        setMessage(prevMessage => prevMessage + emojiObject.emoji);
        setOpen(false);
    };

    if (loading) {
        return (
            <div className="chat-container">
                <p className="loading-message">Laddar chatt...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-container">
                <p className="error-message">{error}</p>
                <button onClick={fetchChatData}>Försök igen</button>
            </div>
        );
    }

    if (!chatData) {
        return (
            <div className="chat-container">
                <p>Ingen chat data hittades</p>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2 className="chat-namn">{chatData.sender}</h2>
                {chatData.issuetype && <div className="chat-type">{chatData.issuetype}</div>}
            </div>
            
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div 
                        key={msg.id || index}
                        className={`message ${msg.sender === 'Agent' ? 'sent' : 'received'}`}
                    >
                        <p>{msg.message}</p>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <input 
                    type="text" 
                    placeholder="Skriv ett meddelande..." 
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

                <button onClick={handleSendMessage}>
                    Skicka
                </button>
            </div>
        </div>
    );
}