import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";
import { useGlobalContext } from '../GlobalContext';

export default function Chat() {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const {
      chatData,
      messages,
      chatLoading,
      chatError,
      chatMessage,
      setChatMessage,
      emojiPickerOpen,
      setEmojiPickerOpen,
      messagesEndRef,
      emojiPickerRef,
      setupChatPolling,
      handleSendMessage,
      handleEmojiClick
    } = useGlobalContext();

    // Setup chat polling on mount
    useEffect(() => {
      console.log('Setting up chat with token:', token);
      const cleanup = setupChatPolling(token);
      return cleanup;
    }, [token, setupChatPolling]);

    // Handle closing the chat
    const handleCloseChat = () => {
      navigate('/'); // Navigate to home
    };

    // Show loading skeleton
    if (chatLoading) {
        return (
            <div className="chat-wrapper">
                <div className="chat-container">
                    <div className="chat-header">
                        <div className="chat-header-skeleton"></div>
                    </div>
                    <div className="chat-messages">
                        <div className="chat-messages-loading">
                            <div className="chat-message-skeleton"></div>
                            <div className="chat-message-skeleton chat-message-skeleton--right"></div>
                            <div className="chat-message-skeleton"></div>
                        </div>
                    </div>
                    <div className="chat-input-container">
                        <div className="chat-input-skeleton"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (chatError) {
        return (
            <div className="chat-wrapper">
                <div className="chat-error">
                    <p>{chatError}</p>
                    <button 
                        onClick={() => setupChatPolling(token)}
                        className="chat-error-button"
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
            <div className="chat-wrapper">
                <div className="chat-empty">
                    Ingen chattdata tillgänglig
                </div>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="chat-wrapper">
            <div className="chat-container">
                <div className="chat-header">
                    <h2 className="chat-name">{chatData.firstName}</h2>
                    {chatData.formType && 
                        <div className="chat-type">{chatData.formType}</div>
                    }
                    <button 
                        className="chat-close" 
                        onClick={handleCloseChat}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="chat-messages">
                    {chatError && (
                        <div className="chat-connection-status">
                            <span>{chatError}</span>
                        </div>
                    )}
                    
                    {messages.map((msg) => (
                        <div 
                            key={msg.id}
                            className={`chat-message ${
                                msg.sender === chatData.firstName 
                                    ? 'chat-message--sent' 
                                    : 'chat-message--received'
                            } ${msg.id.toString().startsWith('temp-') ? 'chat-message--pending' : ''}`}
                        >
                            <p className="chat-message-text">{msg.message}</p>
                            <small className="chat-message-timestamp">
                                {msg.id.toString().startsWith('temp-') 
                                    ? 'Skickar...'
                                    : new Date(msg.timestamp).toLocaleString()
                                }
                            </small>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input 
                        type="text" 
                        className="chat-input-field"
                        placeholder="Skriv ett meddelande..." 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage(token);
                            }
                        }}
                    />

                    <div className="emoji" onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}>😃
                    </div>
                    {emojiPickerOpen && (
                    <div ref={emojiPickerRef} className="emojipicker">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                    )}

                    <button 
                        className="chat-send-button" 
                        onClick={() => handleSendMessage(token)}
                        type="button"
                    >
                        Skicka
                    </button>
                </div>
            </div>
        </div>
    );
}