import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmojiPicker from "emoji-picker-react";

export default function Chat() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const [messages, setMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const emojiPickerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const longPollingRef = useRef(null); // Reference for tracking long polling request
    const abortControllerRef = useRef(null); // Reference for aborting fetch requests
    const modalRef = useRef(null);
    const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null); // Track last message timestamp

    // Initial fetch function for chat info
    const fetchInitialData = async () => {
        if (!token) {
            console.log('No token provided, cannot fetch initial data');
            setError("Ingen token angiven");
            setLoading(false);
            return false;
        }
        
        console.log('Fetching initial chat data for token:', token);
        
        try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            // Använd den kombinerade endpointen med metadata=true
            const chatResponse = await fetch(`/api/chat/${token}?metadata=true`, { 
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            
            if (!chatResponse.ok) {
                throw new Error(`Chat API: ${chatResponse.status}`);
            }

            const chatInfo = await chatResponse.json();
            console.log('Received chat info:', chatInfo);
            
            setChatData(chatInfo);
            
            // Now fetch messages after successfully getting chat info
            return await fetchMessages(true);
        } catch (err) {
            // Ignore abort errors when component unmounts
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
                return false;
            }
            
            console.error('Error fetching chat info:', err);
            setError(`Kunde inte hämta chattdata: ${err.message}`);
            setLoading(false);
            return false;
        }
    };
    
    // Function to fetch messages with optional long polling
    const fetchMessages = async (isInitial = false) => {
        if (!token) return false;
        
        try {
            // Använd den kombinerade endpointen utan metadata-parametern
            let url = `/api/chat/${token}`;
            
            // Add properly formatted since parameter
            let sinceParam;
            if (lastMessageTimestamp) {
                sinceParam = new Date(lastMessageTimestamp).toISOString();
            } else {
                sinceParam = new Date(0).toISOString();
            }
            url += `?since=${encodeURIComponent(sinceParam)}`;
            
            // Create abort controller for this request with timeout
            const controller = new AbortController();
            abortControllerRef.current = controller;
            
            // Set timeout for request
            const timeoutId = setTimeout(() => {
                console.log('Fetch messages timeout reached, aborting...');
                controller.abort();
            }, isInitial ? 8000 : 30000); // shorter timeout for initial request
            
            console.log(`Fetching messages${!isInitial ? ' (long polling)' : ''} from ${url}`);
            
            const messagesResponse = await fetch(url, {
                signal: controller.signal,
                // For long polling requests, extend timeout to 30 seconds
                headers: !isInitial ? { 'X-Long-Polling': 'true' } : {}
            });
            
            clearTimeout(timeoutId); // Clear the timeout once fetch completes
            
            console.log('Messages response received:', { 
                status: messagesResponse.status, 
                ok: messagesResponse.ok 
            });
            
            if (!messagesResponse.ok) {
                throw new Error(`Messages API: ${messagesResponse.status}`);
            }

            console.log('Parsing messages JSON...');
            const chatMessages = await messagesResponse.json();
            console.log('Messages JSON parsed successfully:', { count: chatMessages.length });
            
            // On successful response, update last message timestamp
            if (chatMessages.length > 0) {
                const latestMessage = [...chatMessages].sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                )[0];
                
                setLastMessageTimestamp(latestMessage.timestamp);
                
                console.log('Received messages:', {
                    count: chatMessages.length,
                    latestTimestamp: latestMessage.timestamp
                });
                
                // Update messages - replace on initial fetch, append on subsequent
                setMessages(prev => isInitial ? chatMessages : 
                    // Filter out duplicates when appending
                    [...prev, ...chatMessages.filter(newMsg => 
                        !prev.some(existingMsg => 
                            existingMsg.timestamp === newMsg.timestamp && 
                            existingMsg.message === newMsg.message
                        )
                    )]
                );
            } else {
                console.log('No new messages received');
                // Only update on initial fetch if empty
                if (isInitial) {
                    setMessages([]);
                }
            }
            
            setError(null);
            
            if (isInitial) {
                setLoading(false);
            }
            
            return true;
        } catch (err) {
            // Ignore abort errors from normal cancellation
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
                return false;
            }
            
            console.error('Error fetching messages:', err);
            
            if (!isInitial) {
                // For long polling, just retry without showing error
                return false;
            }
            
            setError(`Kunde inte hämta meddelanden: ${err.message}`);
            setLoading(false);
            return false;
        }
    };

    // Start the long polling cycle
    const startLongPolling = async () => {
        // Clear any existing long polling
        if (longPollingRef.current) {
            clearTimeout(longPollingRef.current);
        }
        
        // Wait a short moment before starting to avoid rapid requests
        longPollingRef.current = setTimeout(async () => {
            console.log('Starting long polling request');
            const success = await fetchMessages(false);
            // Restart long polling regardless of success (with a delay if failed)
            longPollingRef.current = setTimeout(
                startLongPolling, 
                success ? 0 : 3000 // no delay on success, 3s delay on failure
            );
        }, 500);
    };

    // Initial fetch and long polling setup
    useEffect(() => {
        console.log('Setting up chat with token:', token);
        let retryCount = 0;
        const maxRetries = 3;
        
        // Initial fetch with retry logic
        const attemptInitialFetch = async () => {
            const success = await fetchInitialData();
            
            if (!success && retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying initial fetch (${retryCount}/${maxRetries})...`);
                // Exponential backoff: 1s, 2s, 4s
                setTimeout(attemptInitialFetch, 1000 * Math.pow(2, retryCount - 1));
            } else if (success) {
                // Start long polling after successful initial fetch
                console.log('Initial fetch successful, starting long polling');
                startLongPolling();
            } else {
                console.log('All retries failed, not starting long polling');
            }
        };
        
        attemptInitialFetch();
        
        // Cleanup function
        return () => {
            console.log('Cleaning up chat component');
            // Cancel any pending long polling
            if (longPollingRef.current) {
                clearTimeout(longPollingRef.current);
            }
            
            // Abort any ongoing fetch
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [token]);

    // Debug state changes
    useEffect(() => {
        console.log('State updated:', { 
            loading, 
            messageCount: messages.length, 
            hasChatData: chatData ? true : false, 
            error
        });
    }, [loading, chatData, messages, error]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    // Handle emoji click
    const handleEmojiClick = (emojiObject) => {
        setMessage(prevMessage => prevMessage + emojiObject.emoji);
    };

    // Handle sending message
    const handleSendMessage = async () => {
        if (!message.trim()) return;
        
        try {
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatToken: token,
                    sender: 'User',
                    message: message.trim()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            setMessage("");
        } catch (err) {
            console.error("Failed to send message:", err);
            setError(`Kunde inte skicka meddelandet: ${err.message}`);
        }
    };

    useEffect(() => {
        if (!loading) return;
        
        console.log('Setting loading timeout safety');
        const loadingTimeoutId = setTimeout(() => {
            console.log('Loading timeout reached - forcing load completion');
            setLoading(false);
            
            if (!error) {
                setError('Tidsgränsen för inläsningen nåddes. Data kan vara ofullständig.');
            }
        }, 10000); // 10 second timeout
        
        return () => clearTimeout(loadingTimeoutId);
    }, [loading, error]);
    
    // Show loading state
    if (loading) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h2>Laddar chatt...</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', animation: 'pulse 1s infinite' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', animation: 'pulse 1s infinite 0.2s' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', animation: 'pulse 1s infinite 0.4s' }}></div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center', color: '#d32f2f' }}>
                <h2>Ett fel uppstod</h2>
                <p>{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Försök igen
                </button>
            </div>
        );
    }

    // Show empty state if no chat data
    if (!chatData) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h2>Ingen chatt hittades</h2>
                <p>Chatten kan ha utgått eller så är länken felaktig.</p>
                <button 
                    onClick={() => navigate('/')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Tillbaka till startsidan
                </button>
            </div>
        );
    }

    // Main chat UI
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '80vh',
            maxWidth: '800px',
            margin: '20px auto',
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            backgroundColor: '#fff'
        }}>
            {/* Chat header */}
            <div style={{
                padding: '15px',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <h2 style={{ margin: 0 }}>Chatt med {chatData.firstName || 'användare'}</h2>
                <button 
                    onClick={() => navigate('/')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Stäng
                </button>
            </div>
            
            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#f5f5f5'
            }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto', color: '#6c757d' }}>
                        <p>Inga meddelanden ännu</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div 
                            key={index} 
                            style={{
                                alignSelf: msg.sender === 'User' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.sender === 'User' ? '#dcf8c6' : '#fff',
                                padding: '10px 15px',
                                borderRadius: '18px',
                                maxWidth: '70%',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div>
                                <p style={{ margin: '0 0 5px 0' }}>{msg.message}</p>
                                <small style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#999', 
                                    display: 'block',
                                    textAlign: 'right'
                                }}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </small>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <div style={{
                display: 'flex',
                padding: '15px',
                borderTop: '1px solid #ddd',
                backgroundColor: '#fff',
                gap: '10px',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setOpen(!open)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0 5px'
                        }}
                    >
                        😊
                    </button>
                    {open && (
                        <div 
                            ref={emojiPickerRef}
                            style={{
                                position: 'absolute',
                                bottom: '40px',
                                left: '0',
                                zIndex: 10
                            }}
                        >
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                    )}
                </div>
                
                <input 
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Skriv ett meddelande..."
                    style={{
                        flex: 1,
                        padding: '10px 15px',
                        borderRadius: '20px',
                        border: '1px solid #ddd',
                        outline: 'none'
                    }}
                />
                
                <button 
                    onClick={handleSendMessage}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer'
                    }}
                >
                    Skicka
                </button>
            </div>
        </div>
    );
}