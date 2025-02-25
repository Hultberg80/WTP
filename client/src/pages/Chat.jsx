import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";

export default function Chat() {
    const { token } = useParams();
    const navigate = useNavigate(); // Add useNavigate hook
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);
    const modalRef = useRef(null);

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

    // Close modal when clicking outside (keeping this from original)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                !event.target.closest(".emoji")
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Add a function to handle closing the chat
    const handleCloseChat = () => {
        // Clear the interval to stop polling
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        // Navigate back or to a specific route
        navigate('/'); // Navigate to home or another appropriate route
        
        // If you're using this in a modal context, you might want to call a parent function instead
        // For example: props.onClose();
    };

    const handleSendMessage = async () => {
        if (message.trim() === "" || !chatData) return;
        
        // Store message locally before sending (for immediate UI feedback)
        const currentMessage = message.trim();
        // Clear the input field immediately
        setMessage("");
        
        const messageToSend = {
            chatToken: token,
            sender: chatData.firstName,
            message: currentMessage
            // Don't set timestamp - let the server handle it
        };
        
        // Add temporary message to UI (optional, for immediate feedback)
        const tempMessage = {
            id: `temp-${Date.now()}`,
            sender: chatData.firstName,
            message: currentMessage,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMessage]);
    
        try {
            console.log('Sending message:', messageToSend);
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageToSend)
            });
    
            if (!response.ok) {
                throw new Error('Kunde inte skicka meddelande');
            }
    
            // Get the response data which should include the saved message with ID
            const result = await response.json();
            console.log('Message sent successfully:', result);
            
            // Replace temporary message with server response or fetch fresh data
            await fetchData();
        } catch (error) {
            console.error('Error sending message:', error);
            setError("Kunde inte skicka meddelande. Försök igen.");
            // Optionally revert temporary message if sending failed
        }
    };
    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        setOpen(false);
    };

    // Show loading skeleton (using original styling)
    if (loading) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__header">
                        <div className="chat-modal__header-skeleton"></div>
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

    // Show error state (using original styling)
    if (error) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__error">
                        <p>{error}</p>
                        <button 
                            onClick={fetchData}
                            className="chat-modal__error-button"
                        >
                            Försök igen
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show empty state if no chat data (using original styling)
    if (!chatData) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__empty">
                        Ingen chattdata tillgänglig
                    </div>
                </div>
            </div>
        );
    }

    // Main chat UI (using original styling)
    return (
        <div className="chat-modal" ref={modalRef}>
            <div className="chat-modal__container">
                <div className="chat-modal__header">
                    <h2 className="chat-modal__name">{chatData.firstName}</h2>
                    {chatData.formType && 
                        <div className="chat-modal__type">{chatData.formType}</div>
                    }
                    <button 
                        className="chat-modal__close" 
                        onClick={handleCloseChat}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="chat-modal__messages">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id}
                            className={`chat-modal__message ${
                                msg.sender === chatData.firstName 
                                    ? 'chat-modal__message--sent' 
                                    : 'chat-modal__message--received'
                            }`}
                        >
                            <p className="chat-modal__message-text">{msg.message}</p>
                            <small className="chat-modal__message-timestamp">
                                {new Date(msg.timestamp).toLocaleString()}
                            </small>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-modal__input-container">
                    <input 
                        type="text" 
                        className="chat-modal__input-field"
                        placeholder="Skriv ett meddelande..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage();
                            }
                        }}
                    />

                    <div className="emoji" onClick={() => setOpen(!open)}>😃
                    </div>
                    {open && (
                    <div ref={emojiPickerRef} className="emojipicker">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                    )}

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