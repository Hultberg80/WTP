// client/src/pages/Chat.jsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";
import { useChat } from '../context';

export default function Chat() {
  const { token } = useParams();
  const navigate = useNavigate();
  
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

  // Initialize chat when component mounts or token changes
  useEffect(() => {
    if (token) {
      const cleanup = initializeChat(token);
      return cleanup;
    }
  }, [token, initializeChat]);

  // Handle closing the chat
  const handleCloseChat = () => {
    navigate('/');
  };

  // Handle sending message with Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="chat-modal">
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

  // Show error state
  if (error) {
    return (
      <div className="chat-modal">
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
      <div className="chat-modal">
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
    <div className="chat-modal">
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
            onKeyPress={handleKeyPress}
          />

          <div className="emoji" onClick={toggleEmojiPicker}>😃
          </div>
          {emojiPickerOpen && (
            <div ref={emojiPickerRef} className="emojipicker">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
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