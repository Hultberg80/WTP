import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";

// ChatModal tar token och onClose som props
export default function ChatModal({ token, onClose }) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const emojiPickerRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);
    const modalRef = useRef(null);
    const inputContainerRef = useRef(null);

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

    // Position emoji picker relative to emoji button
    useEffect(() => {
        if (showEmojiPicker && emojiPickerRef.current && emojiButtonRef.current && inputContainerRef.current) {
            // Ensure picker is positioned properly relative to the button
            const buttonRect = emojiButtonRef.current.getBoundingClientRect();
            const containerRect = inputContainerRef.current.getBoundingClientRect();
            
            // Update picker position
            const pickerElement = emojiPickerRef.current.querySelector('.EmojiPickerReact') || emojiPickerRef.current;
            if (pickerElement) {
                pickerElement.style.position = 'fixed';
                pickerElement.style.bottom = `${window.innerHeight - containerRect.top + 10}px`;
                pickerElement.style.left = `${buttonRect.left}px`;
                pickerElement.style.width = '320px';
                pickerElement.style.height = '400px';
                pickerElement.style.zIndex = '2000';
                pickerElement.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
                pickerElement.style.borderRadius = '8px';
            }
        }
    }, [showEmojiPicker]);

    // Debug state changes
    useEffect(() => {
        console.log('State updated:', {
            loading,
            hasChat: !!chatData,
            messageCount: messages.length,
            error,
            showEmojiPicker
        });
    }, [loading, chatData, messages, error, showEmojiPicker]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Close emoji picker when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showEmojiPicker && 
                emojiPickerRef.current && 
                !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current && 
                !emojiButtonRef.current.contains(event.target)) {
                console.log('Clicking outside emoji picker, closing it');
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                handleCloseChat();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle closing the chat modal
    const handleCloseChat = () => {
        // Clear the interval to stop polling
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        // Call the onClose prop to close the modal
        onClose();
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
        console.log("Emoji selected:", emojiObject);
        setMessage(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const toggleEmojiPicker = () => {
        console.log("Toggling emoji picker. Current state:", showEmojiPicker);
        setShowEmojiPicker(prev => !prev);
    };

    if (loading) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__header">
                        <h2>Laddar chatt...</h2>
                        <button className="chat-modal__close" onClick={handleCloseChat}>
                            &times;
                        </button>
                    </div>
                    <div className="chat-modal__messages">
                        <div className="chat-modal__loading">
                            <p>Hämtar chattdata... Detta kan ta en stund.</p>
                            <div className="loading-spinner"></div>
                        </div>
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

    // Show empty state if no chat data
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

    // Main chat UI
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

                <div className="chat-modal__input-container" ref={inputContainerRef}>
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

                    <div 
                        className="chat-modal__emoji-trigger" 
                        onClick={toggleEmojiPicker}
                        ref={emojiButtonRef}
                    >
                        😃
                    </div>

                    {showEmojiPicker && (
                        <div 
                            className="chat-modal__emoji-picker" 
                            ref={emojiPickerRef}
                        >
                            <EmojiPicker 
                                onEmojiClick={handleEmojiClick}
                                width="300px"
                                height="350px"
                            />
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