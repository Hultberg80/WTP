// pages/ChatModal.jsx
// Exportera ChatModal komponenten för användning i Main.jsx
import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";
import { useChat } from '../context'; // Använd context istället för prop drilling

export default function ChatModal({ token, onClose }) {
    // Använd useChat hook för chattfunktionalitet
    const {
        chatData,
        messages,
        message,
        setMessage,
        loading,
        error,
        emojiPickerOpen,
        messagesEndRef,
        emojiPickerRef,
        initializeChat,
        toggleEmojiPicker,
        handleEmojiClick,
        sendMessage
    } = useChat();
    
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const modalRef = useRef(null);
    const inputContainerRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const intervalRef = useRef(null);

    // Initialize chat when component mounts or token changes
    useEffect(() => {
        console.log('ChatModal mounted with token:', token);
        if (token) {
            const cleanup = initializeChat(token);
            return cleanup;
        }
    }, [token, initializeChat]);

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

    // Handle key press for sending messages
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    if (loading && !chatData) {
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
    if (error && !chatData) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__error">
                        <p>{error}</p>
                        <button 
                            onClick={() => initializeChat(token)}
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

    // Main chat UI - använder chattfunktionalitet från context
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
                    {/* Show error message if there is one but we still have chat data */}
                    {error && (
                        <div className="chat-modal__message" style={{margin: '0 auto', maxWidth: '80%'}}>
                            <p className="chat-modal__message-text" style={{background: '#fee2e2', color: '#dc2626'}}>
                                {error}
                            </p>
                        </div>
                    )}
                
                    {messages.length === 0 ? (
                        <div className="chat-modal__message chat-modal__message--received">
                            <p className="chat-modal__message-text">
                                Välkommen till chatten! Hur kan vi hjälpa dig idag?
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div 
                                key={msg.id || `${msg.sender}-${msg.timestamp}`}
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
                        ))
                    )}
                    
                    {/* Show loading indicator for refreshes */}
                    {loading && chatData && (
                        <div className="chat-modal__message" style={{textAlign: 'center', background: 'transparent'}}>
                            <p style={{fontSize: '0.8rem', color: '#888'}}>Uppdaterar...</p>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-modal__input-container" ref={inputContainerRef}>
                    <input 
                        type="text" 
                        className="chat-modal__input-field"
                        placeholder="Skriv ett meddelande..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />

                    <div 
                        className="chat-modal__emoji-trigger" 
                        onClick={toggleEmojiPicker}
                        ref={emojiButtonRef}
                    >
                        😃
                    </div>

                    {emojiPickerOpen && (
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
                        onClick={sendMessage}
                        type="button"
                    >
                        Skicka
                    </button>
                </div>
            </div>
        </div>
    );
}