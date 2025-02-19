import { useState, useEffect, useRef } from 'react';
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
    const intervalRef = useRef(null);

    // Combined fetch function
    const fetchData = async () => {
        if (!token) return;

        try {
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

            console.log('Received data:', { chatInfo, chatMessages });
            
            setChatData(chatInfo);
            setMessages(chatMessages);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        console.log('Setting up chat with token:', token);
        
        // Initial fetch
        fetchData();

        // Set up polling
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(fetchData, 5000);

        return () => clearInterval(intervalRef.current);
    }, [token]);

    // Debug state changes
    useEffect(() => {
        console.log('State updated:', {
            loading,
            hasChat: !!chatData,
            messageCount: messages.length,
            error
        });
    }, [loading, chatData, messages, error]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (message.trim() === "" || !chatData) return;

        try {
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatToken: token,
                    sender: chatData.sender,
                    message: message,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Kunde inte skicka meddelande');
            }

            setMessage("");
            await fetchData();
        } catch (error) {
            setError("Kunde inte skicka meddelande. Försök igen.");
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        setOpen(false);
    };

    // Show loading skeleton
    if (loading) {
        return (
            <div className="chat-container">
                <div className="chat-header">
                    <div className="h-8 w-32 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="messages-container">
                    <div className="space-y-4 p-4">
                        <div className="h-16 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-16 w-2/3 bg-gray-100 rounded animate-pulse ml-auto"></div>
                        <div className="h-16 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="chat-input">
                    <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="chat-container">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
                    <p>{error}</p>
                    <button 
                        onClick={fetchData}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Försök igen
                    </button>
                </div>
            </div>
        );
    }

    // Show empty state if no chat data
    if (!chatData) {
        return (
            <div className="chat-container">
                <div className="p-4 text-gray-600">
                    Ingen chattdata tillgänglig
                </div>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2 className="chat-namn">{chatData.firstName}</h2>
                {chatData.formType && <div className="chat-type">{chatData.formType}</div>}
            </div>
            
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div 
                        key={msg.id || index}
                        className={`message ${msg.sender === chatData.firstName ? 'sent' : 'received'}`}
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