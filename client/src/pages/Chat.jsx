import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";


export default function Chat() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [initialMessage, setInitialMessage] = useState(null);
    const [currentUser, setCurrentUser] = useState("User"); // Default sender name
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);
    const modalRef = useRef(null);

    // STEP 1: Get the first message from initial_message
    useEffect(() => {
        if (!token) return;

        const fetchInitialMessage = async () => {
            try {
                console.log("Fetching initial message for token:", token);
                const response = await fetch(`/api/initial-message/${token}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch initial message: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("Initial message data:", data);
                
                setInitialMessage(data);
                setCurrentUser(data.sender);
                
                // Add initial message to messages array
                setMessages([{
                    id: 'initial',
                    sender: data.sender,
                    message: data.message,
                    timestamp: data.submittedAt
                }]);
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching initial message:", err);
                setError("Could not load initial message. Please try again.");
                setLoading(false);
            }
        };

        fetchInitialMessage();
    }, [token]);

    // STEP 3: Polling for new messages
    useEffect(() => {
        // Only start polling after initial message is loaded
        if (!initialMessage) return;
        
        console.log("Setting up polling for new messages");
        
        const pollLatestMessage = async () => {
            if (!token) return;
            
            try {
                const response = await fetch(`/api/chat/latest/${token}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch latest message: ${response.status}`);
                }
                
                const latestMessage = await response.json();
                console.log("Latest message:", latestMessage);
                
                // Check if this is a new message we don't already have
                const messageExists = messages.some(msg => 
                    msg.message === latestMessage.message && 
                    msg.sender === latestMessage.sender &&
                    new Date(msg.timestamp).getTime() === new Date(latestMessage.submitted_at).getTime()
                );
                
                if (!messageExists) {
                    console.log("Adding new message to list");
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}`,
                        sender: latestMessage.sender,
                        message: latestMessage.message,
                        timestamp: latestMessage.submitted_at
                    }]);
                }
            } catch (err) {
                console.error("Error polling latest message:", err);
                // Don't set error state here to avoid disrupting the chat
            }
        };
        
        // Poll immediately once
        pollLatestMessage();
        
        // Set up interval for polling
        intervalRef.current = setInterval(pollLatestMessage, 3000);
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [token, initialMessage, messages]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                !event.target.closest(".emoji-button")
            ) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Function to handle closing the chat
    function handleCloseChat() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        navigate('/');
    }

    // STEP 2: Send message to chat_messages table
    async function handleSendMessage() {
        if (message.trim() === "" || !initialMessage) return;
        
        const currentMessage = message.trim();
        setMessage("");
        
        // Create message object to send to API
        const messageToSend = {
            chatToken: token,
            sender: currentUser,
            message: currentMessage
        };
        
        // Optimistically add to UI
        const tempMessage = {
            id: `temp-${Date.now()}`,
            sender: currentUser,
            message: currentMessage,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMessage]);
        
        try {
            console.log("Sending message:", messageToSend);
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageToSend)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Message sent successfully:", result);
            
            // The polling will pick up the new message automatically
        } catch (error) {
            console.error("Error sending message:", error);
            setError("Could not send message. Please try again.");
            
            // Remove the temporary message
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        }
    }

    function handleEmojiClick(emojiObject) {
        setMessage(prev => prev + emojiObject.emoji);
        setOpen(false);
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return "No date";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid date";
        return date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Loading state
    if (loading) {
        return (
            <div className="chat-container" ref={modalRef}>
                <div className="chat-loading">
                    <div className="chat-loading-spinner"></div>
                    <p>Loading chat...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="chat-container" ref={modalRef}>
                <div className="chat-error">
                    <p>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="chat-error-button"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    // No initial message state
    if (!initialMessage) {
        return (
            <div className="chat-container" ref={modalRef}>
                <div className="chat-empty">
                    <p>No chat found with this token.</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="chat-empty-button"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="main-container">
            <div className="chat-container">
                <div className="chat-header">
                    <h2 className="chat-name">{initialMessage.sender}</h2>
                    
                    {initialMessage.formType && (
                        <div className="chat-form-type">
                            {initialMessage.formType}
                        </div>
                    )}
                    
                    {initialMessage.issueType && (
                        <div className="chat-issue-type">
                            {initialMessage.issueType}
                        </div>
                    )}
                    
                    <button 
                        className="chat-close-button" 
                        onClick={handleCloseChat}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div 
                            key={msg.id || index}
                            className={`chat-message ${
                                msg.sender === currentUser
                                    ? 'chat-message-sent' 
                                    : 'chat-message-received'
                            }`}
                        >
                            <div className="chat-message-sender">{msg.sender}</div>
                            <div className="chat-message-text">{msg.message}</div>
                            <div className="chat-message-time">
                                {formatDate(msg.timestamp)}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input 
                        type="text" 
                        className="chat-input-field"
                        placeholder="Write a message..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage();
                            }
                        }}
                    />

                    <div className="emoji-button" onClick={() => setOpen(!open)}>
                        😃
                    </div>
                    
                    {open && (
                        <div ref={emojiPickerRef} className="emoji-picker-container">
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                    )}

                    <button 
                        className="chat-send-button" 
                        onClick={handleSendMessage}
                        type="button"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}