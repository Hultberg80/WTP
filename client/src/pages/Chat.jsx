import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";

export default function Chat() {
    const { token } = useParams();
    const location = useLocation(); // För att spåra URL-ändringar
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
    const previousToken = useRef(null); // För att spåra tokenändringar
    const isFetchingRef = useRef(false); // Track if a fetch is in progress
    const abortControllerRef = useRef(null); // Store AbortController for cancellation
    const maxRetries = useRef(0); // Track number of failed attempts
    const retryTimerRef = useRef(null); // For cleanup of timeouts
    const userInitiatedRef = useRef(false); // Track if action was initiated by user

    // Kombinerad fetch-funktion för att hämta chattdata
    const fetchData = async (forceRefresh = false, userInitiated = false) => {
        if (!token) return;
        
        // If user initiated, set the flag
        if (userInitiated) {
            userInitiatedRef.current = true;
        }
        
        // Skip if already fetching (unless it's a forced refresh or user initiated)
        if (isFetchingRef.current && !forceRefresh && !userInitiated) {
            console.log('Fetch already in progress, skipping');
            return;
        }

        // If same token visited again, only check for new messages
        if (previousToken.current === token && !forceRefresh) {
            console.log('Same token visited, checking for new messages');
        }

        previousToken.current = token;
        
        // Cancel any ongoing requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;
        
        // Mark that we're fetching
        isFetchingRef.current = true;

        try {
            const timestamp = new Date().getTime();
            
            // Use a shorter timeout for user-initiated actions
            const timeoutMs = userInitiated ? 4000 : 8000;
            
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Förfrågan tog för lång tid')), timeoutMs);
            });
            
            // Make the requests with both timeout and abort signal
            const chatPromise = fetch(`/api/chat/${token}?_=${timestamp}`, {
                credentials: 'include',
                signal: signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const messagesPromise = fetch(`/api/chat/messages/${token}?_=${timestamp}`, {
                credentials: 'include',
                signal: signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            // For user-initiated actions, prioritize chat info over messages
            if (userInitiated) {
                // First get chat info (most important)
                const chatResponse = await Promise.race([chatPromise, timeoutPromise]);
                
                if (!chatResponse.ok) {
                    throw new Error('Kunde inte hämta chattdata');
                }
                
                const chatInfo = await chatResponse.json();
                
                // Update chat data immediately for faster UI response
                setChatData(chatInfo);
                setError(null);
                
                // Then get messages (can arrive a bit later)
                try {
                    const messagesResponse = await Promise.race([messagesPromise, timeoutPromise]);
                    if (messagesResponse.ok) {
                        const chatMessages = await messagesResponse.json();
                        setMessages(chatMessages);
                    }
                } catch (msgErr) {
                    console.warn('Message fetch delayed, will retry');
                    // Don't show error for messages, just for chat data
                }
            } else {
                // Regular flow for non-user-initiated actions
                const [chatResponse, messagesResponse] = await Promise.all([
                    Promise.race([chatPromise, timeoutPromise]),
                    Promise.race([messagesPromise, timeoutPromise])
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
            }
            
            // Reset user initiated flag
            userInitiatedRef.current = false;
            
            // Reset retry counter on success
            maxRetries.current = 0;

            // Uppdatera senaste aktivitetstid i localStorage
            try {
                localStorage.setItem('lastChatActivity', new Date().toISOString());
                localStorage.setItem(`chat_${token}_lastFetch`, new Date().toISOString());
            } catch (e) {
                console.log('Error writing to localStorage:', e);
            }
        } catch (err) {
            // Ignore abort errors
            if (err.name === 'AbortError') {
                console.log('Request was cancelled');
                return;
            }
            
            console.error('Error fetching data:', err);
            
            // Only show error if not user initiated or if it's been more than 2 seconds
            if (!userInitiated || Date.now() - timestamp > 2000) {
                setError(err.message);
            }
            
            // Increment retry counter
            maxRetries.current++;
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
            userInitiatedRef.current = false;
        }
    };

    // Uppdatera när location (URL) ändras
    useEffect(() => {
        console.log('Location changed, refreshing chat data');
        setLoading(true);
        setChatData(null);
        setMessages([]);
        
        window.scrollTo(0, 0);
        
        // Reset retry counter on location change
        maxRetries.current = 0;
        
        // Clear any existing timeouts
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
        }
        
        retryTimerRef.current = setTimeout(() => {
            fetchData(true, true); // Mark as user initiated
            retryTimerRef.current = null;
        }, 100);
        
        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [location.key]);

    // Initial fetch och polling
    useEffect(() => {
        console.log('Setting up chat with token:', token);
        
        // Reset retry counter when token changes
        maxRetries.current = 0;
        
        // Cancel any ongoing requests from previous tokens
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        
        // Clear any existing intervals or timers
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        
        // Reset fetching status
        isFetchingRef.current = false;
        
        // Check session first
        fetch('/api/session/refresh?_=' + new Date().getTime(), {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
        .then(response => {
            // Handle non-OK responses properly
            if (!response.ok) {
                throw new Error(`Session refresh failed with status ${response.status}`);
            }
            
            // Try to parse JSON safely
            return response.text().then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.warn('Invalid JSON from session refresh:', text.substring(0, 100));
                    return { error: true };
                }
            });
        })
        .then(() => {
            fetchData(true, true); // Treat initial load as user-initiated for speed
        })
        .catch(error => {
            console.error('Session refresh error:', error);
            // Continue with chat loading even if session refresh fails
            console.log('Attempting to load chat despite session refresh failure');
            fetchData(true, true);
        });

        // Modified polling logic with retry limiting
        const setupPolling = () => {
            intervalRef.current = setInterval(() => {
                if (!isFetchingRef.current) {
                    if (maxRetries.current >= 3) {
                        console.log('Too many failures, stopping auto-refresh');
                        clearInterval(intervalRef.current);
                        setError('För många misslyckade försök. Klicka på "Försök igen" för att fortsätta.');
                        return;
                    }
                    
                    fetchData(false, false)
                        .catch(err => {
                            console.log('Fetch error in polling:', err);
                        });
                } else {
                    console.log('Skipping poll, fetch already in progress');
                }
            }, 8000); // Increased to 8 seconds
        };
        
        setupPolling();
        
        // Cleanup function
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
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

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                // Implementera stängningsfunktionalitet om det behövs
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Hantera emoji-picker när man klickar utanför
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.classList.contains('chat-modal__emoji-trigger')) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            
            // Create a controller specifically for this request
            const sendController = new AbortController();
            const sendTimeoutId = setTimeout(() => sendController.abort(), 8000);
            
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                credentials: 'include', // Viktigt för att skicka med cookies
                signal: sendController.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify(messageToSend)
            });
            
            clearTimeout(sendTimeoutId);
    
            if (!response.ok) {
                throw new Error('Kunde inte skicka meddelande');
            }
    
            // Get the response data which should include the saved message with ID
            const result = await response.json();
            console.log('Message sent successfully:', result);
            
            // Reset retry counter on successful message send
            maxRetries.current = 0;
            
            // Replace temporary message with server response or fetch fresh data
            await fetchData(true, true); // Mark as user initiated for speed
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Send message request aborted due to timeout');
                setError("Meddelandet tog för lång tid att skicka. Försök igen.");
            } else {
                console.error('Error sending message:', error);
                setError("Kunde inte skicka meddelande. Försök igen.");
            }
        }
    };
    
    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        setOpen(false);
    };

    // Show loading skeleton
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

    // Show error state
    if (error) {
        return (
            <div className="chat-modal" ref={modalRef}>
                <div className="chat-modal__container">
                    <div className="chat-modal__error">
                        <p>{error}</p>
                        <button 
                            onClick={() => {
                                setError(null);
                                setLoading(true);
                                maxRetries.current = 0; // Reset retry counter
                                fetchData(true, true); // Mark as user initiated
                            }}
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
                        <p>Ingen chattdata tillgänglig</p>
                        <button 
                            onClick={() => {
                                setLoading(true);
                                maxRetries.current = 0; // Reset retry counter
                                fetchData(true, true); // Mark as user initiated
                            }}
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
                    <h2 className="chat-modal__name">{chatData.firstName}</h2>
                    {chatData.formType && 
                        <div className="chat-modal__type">{chatData.formType}</div>
                    }
                    <button 
                        className="chat-modal__close" 
                        onClick={() => window.close()}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="chat-modal__messages">
                    {messages.map((msg) => (
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
                                {new Date(msg.timestamp).toLocaleString('sv-SE')}
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

                    <div className="chat-modal__emoji-trigger" onClick={() => setOpen(!open)}>
                        😃
                    </div>

                    {open && (
                        <div ref={emojiPickerRef} className="chat-modal__emoji-picker">
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