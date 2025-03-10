import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";

export default function ChatModal({ isOpen, onClose, chatToken }) {
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatOwner, setChatOwner] = useState(null);
    const [userName, setUserName] = useState("You"); // Default user name
    const [open, setOpen] = useState(false);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);
    const modalRef = useRef(null);

    // Simple fetch for chat messages
    const fetchMessages = async () => {
        if (!chatToken) return;

        try {
            const response = await fetch(`/api/chat/messages/${chatToken}`);

            if (!response.ok) {
                throw new Error(`Kunde inte hämta chatmeddelanden: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Set messages from response
            setMessages(data.messages);
            
            // Set chat owner (first sender)
            if (data.chatOwner && !chatOwner) {
                setChatOwner(data.chatOwner);
                
                // If we haven't set a user name yet, set it to something different than the chat owner
                if (userName === "You") {
                    setUserName(data.chatOwner === "Support" ? "You" : "Support");
                }
            }
            
            setError(null);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Set up initial fetch and polling when modal opens
    useEffect(() => {
        if (isOpen && chatToken) {
            console.log('Setting up chat with token:', chatToken);
            setLoading(true);
            
            // Initial data fetch
            fetchMessages();

            // Set up polling every 5 seconds
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            intervalRef.current = setInterval(fetchMessages, 5000);
        }

        // Clean up interval when modal closes
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isOpen, chatToken]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Close emoji picker when clicking outside
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

    // Handle sending a new message
    const handleSendMessage = async () => {
        if (message.trim() === "") return;
        
        // Store message locally before sending (for immediate UI feedback)
        const currentMessage = message.trim();
        
        // Clear the input field immediately for better UX
        setMessage("");
        
        const messageToSend = {
            chatToken: chatToken,
            sender: userName,
            message: currentMessage
            // Server will handle timestamp
        };
        
        // Add temporary message to UI for immediate feedback
        const tempMessage = {
            id: `temp-${Date.now()}`,
            sender: userName,
            message: currentMessage,
            timestamp: new Date().toISOString(),
            chatToken: chatToken
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
    
            // Get the server response with the saved message
            const result = await response.json();
            console.log('Message sent successfully:', result);
            
            // Refresh messages to get the official message with server timestamp
            await fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            setError("Kunde inte skicka meddelande. Försök igen.");
        }
    };

    // Handle emoji selection
    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        setOpen(false);
    };

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    // Show loading skeleton
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

    // Show error state
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

    // Main chat UI
    return (
        <div className="chat-modal" ref={modalRef}>
            <div className="chat-modal__container">
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
                
                <div className="chat-modal__messages">
                    {messages.length === 0 ? (
                        <div className="chat-modal__empty">
                            Inga meddelanden än
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div 
                                key={msg.id}
                                className={`chat-modal__message ${
                                    msg.sender === userName 
                                        ? 'chat-modal__message--sent' 
                                        : 'chat-modal__message--received'
                                }`}
                            >
                                <p className="chat-modal__message-text">{msg.message}</p>
                                <small className="chat-modal__message-timestamp">
                                    {new Date(msg.timestamp).toLocaleString()}
                                </small>
                            </div>
                        ))
                    )}
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