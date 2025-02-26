import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// Create the context
const GlobalContext = createContext();

// Custom hook to use the context
export const useGlobalContext = () => useContext(GlobalContext);

// Provider component
export const GlobalProvider = ({ children }) => {
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    serviceType: '',
    issueType: '',
    message: '',
    registrationNumber: '',
    insuranceType: ''
  });
  const [companyType, setCompanyType] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat state
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Dashboard state
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [lastTicketTimestamp, setLastTicketTimestamp] = useState(null);
  const [isTicketPolling, setIsTicketPolling] = useState(false);
  const ticketAbortControllerRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Form functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      email: '',
      serviceType: '',
      issueType: '',
      message: '',
      registrationNumber: '',
      insuranceType: ''
    });
    setCompanyType('');
    setMessage({ text: '', isError: false });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setIsSubmitting(true);
    
    let endpoint = '';
    let submitData = {
      firstName: formData.firstName,
      email: formData.email,
      companyType: companyType,
      message: formData.message,
      isChatActive: true,
      submittedAt: new Date().toISOString()
    };

    switch (companyType) {
      case 'Tele/Bredband':
        endpoint = '/api/tele';
        submitData = {
          ...submitData,
          serviceType: formData.serviceType,
          issueType: formData.issueType,
        };
        break;
      case 'Fordonsservice':
        endpoint = '/api/fordon';
        submitData = {
          ...submitData,
          registrationNumber: formData.registrationNumber,
          issueType: formData.issueType,
        };
        break;
      case 'Försäkringsärenden':
        endpoint = '/api/forsakring';
        submitData = {
          ...submitData,
          insuranceType: formData.insuranceType,
          issueType: formData.issueType,
        };
        break;
      default:
        setMessage({ text: 'Välj ett område', isError: true });
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          text: 'Formuläret har skickats! Kolla din e-post för chattlänken.', 
          isError: false 
        });
        resetForm();
      } else {
        setMessage({ text: 'Ett fel uppstod vid skickandet av formuläret', isError: true });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ 
        text: 'Ett fel uppstod. Vänligen försök igen eller kontakta oss via telefon.', 
        isError: true 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chat functions
  const fetchChatInfo = useCallback(async (token) => {
    if (!token) return;

    try {
      const chatResponse = await fetch(`/api/chat/${token}`);

      if (!chatResponse.ok) {
        throw new Error('Kunde inte hämta chattdata');
      }

      const chatInfo = await chatResponse.json();
      setChatData(chatInfo);
      setChatError(null);
    } catch (err) {
      console.error('Error fetching chat info:', err);
      setChatError(err.message);
    }
  }, []);

  const longPollMessages = useCallback(async (token) => {
    if (!token || isPolling) return;
    
    setIsPolling(true);
    
    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    let timeoutId = null;
    
    try {
      // Construct URL with lastMessageTimestamp if we have one
      let url = `/api/chat/messages/${token}`;
      if (lastMessageTimestamp) {
        url += `?since=${encodeURIComponent(lastMessageTimestamp)}`;
      }
      
      // Create a timeout that will abort the request if it takes too long
      // This is a safety measure in case the server doesn't respond
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 35000); // Slightly longer than server timeout
      
      // Make the long polling request
      const response = await fetch(url, {
        signal, 
        // Long requests need longer timeouts
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Clear the timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta chattmeddelanden');
      }
      
      const newMessages = await response.json();
      
      // Reset error state since we successfully got data
      if (chatError) {
        setChatError(null);
      }
      
      // Update messages if we got any new ones
      if (newMessages && newMessages.length > 0) {
        setMessages(prev => {
          // Filter out duplicates by creating a map of existing message IDs
          const existingIds = new Map(prev.map(msg => [msg.id, true]));
          
          // Combine existing messages with new ones, filtering out duplicates
          const combinedMessages = [
            ...prev,
            ...newMessages.filter(msg => !existingIds.has(msg.id))
          ];
          
          // Filter out temporary messages that have been replaced by real ones
          const realMessages = combinedMessages.filter(msg => {
            // Keep the message if it's not a temp message or if no real message with same content exists
            return !msg.id.toString().startsWith('temp-') || 
              !newMessages.some(newMsg => 
                newMsg.sender === msg.sender && 
                newMsg.message === msg.message
              );
          });
          
          // Sort by timestamp
          return realMessages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
        });
        
        // Update the last message timestamp
        if (newMessages.length > 0) {
          const latestMsg = newMessages.reduce((latest, msg) => {
            return new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest;
          }, newMessages[0]);
          
          setLastMessageTimestamp(latestMsg.timestamp);
        }
      }
      
      // Immediately start another long poll
      setIsPolling(false);
      longPollMessages(token);
      
    } catch (err) {
      // Always clear the timeout to prevent leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Don't treat aborted requests as errors
      if (err.name !== 'AbortError') {
        console.error('Error in long polling:', err);
        setChatError('Tappade anslutningen till chatten. Försöker återansluta...');
        
        // Exponential backoff for reconnecting
        const retryDelay = chatError ? 5000 : 1000; // Longer delay if already in error state
        
        // Retry after a delay if there was an error
        setTimeout(() => {
          setIsPolling(false);
          longPollMessages(token);
        }, retryDelay);
      } else {
        // This was an intentional abort, just reset polling state
        setIsPolling(false);
      }
    }
  }, [isPolling, lastMessageTimestamp, chatError, token]);

  // Initial setup for chat
  const setupChatPolling = useCallback((token) => {
    // Cancel any existing long poll requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setChatLoading(true);
    
    // First fetch the chat info and initial messages
    Promise.all([
      fetchChatInfo(token),
      fetch(`/api/chat/messages/${token}`).then(res => res.json())
    ])
    .then(([_, initialMessages]) => {
      setMessages(initialMessages);
      
      // Set the latest message timestamp if there are any messages
      if (initialMessages && initialMessages.length > 0) {
        // Find the latest message
        const latestMsg = initialMessages.reduce((latest, msg) => {
          return new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest;
        }, initialMessages[0]);
        
        setLastMessageTimestamp(latestMsg.timestamp);
      }
      
      // Start long polling
      setIsPolling(false);
      longPollMessages(token);
    })
    .catch(err => {
      console.error('Error during initial chat setup:', err);
      setChatError(err.message);
    })
    .finally(() => {
      setChatLoading(false);
    });
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsPolling(false);
    };
  }, [fetchChatInfo, longPollMessages]);

  const handleSendMessage = async (token) => {
    if (chatMessage.trim() === "" || !chatData) return;
    
    // Store message locally before sending
    const currentMessage = chatMessage.trim();
    // Clear the input field immediately
    setChatMessage("");
    
    const messageToSend = {
      chatToken: token,
      sender: chatData.firstName,
      message: currentMessage
    };
    
    // Add temporary message to UI with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      sender: chatData.firstName,
      message: currentMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);

    try {
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
      
      // Update lastMessageTimestamp to the timestamp of the new message
      // This will be used for subsequent long polling requests
      if (result.chatMessage && result.chatMessage.timestamp) {
        setLastMessageTimestamp(result.chatMessage.timestamp);
      }
      
      // Replace the temporary message with the real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? result.chatMessage : msg
      ));
      
      // If we have an active abort controller, abort it to immediately
      // start a new long polling request for the latest messages
      if (abortControllerRef.current && isPolling) {
        abortControllerRef.current.abort();
        setIsPolling(false);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setChatError("Kunde inte skicka meddelande. Försök igen.");
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setChatMessage(prev => prev + emojiObject.emoji);
    setEmojiPickerOpen(false);
  };

  // Dashboard functions
  // Dashboard functions
  const longPollTickets = useCallback(async () => {
    if (isTicketPolling) return;
    
    setIsTicketPolling(true);
    
    // Cancel any existing requests
    if (ticketAbortControllerRef.current) {
      ticketAbortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    ticketAbortControllerRef.current = new AbortController();
    const signal = ticketAbortControllerRef.current.signal;
    
    let timeoutId = null;
    
    try {
      // Set loading state on initial load
      if (initialLoadRef.current) {
        setDashboardLoading(true);
      }
      
      // Clear any previous errors
      setDashboardError(null);
      
      // Construct URL with lastTicketTimestamp if we have one
      let url = '/api/tickets';
      if (lastTicketTimestamp) {
        url += `?since=${encodeURIComponent(lastTicketTimestamp)}`;
      }
      
      // Create a timeout that will abort the request if it takes too long
      timeoutId = setTimeout(() => {
        if (ticketAbortControllerRef.current) {
          ticketAbortControllerRef.current.abort();
        }
      }, 25000); // Slightly longer than server timeout
      
      const response = await fetch(url, {
        signal, 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Clear the timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (response.status === 403) {
        throw new Error('Åtkomst nekad. Vänligen logga in igen.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Only process if we have new data
      if (data && data.length > 0) {
        const newTickets = data.map(ticket => ({
          ...ticket,
          id: ticket.chatToken,
          issueType: `${ticket.sender} - ${ticket.formType}`,
          wtp: ticket.formType,
          chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
        }));

        updateTasks(newTickets);
        
        // Update the last ticket timestamp if we have new tickets
        if (data.length > 0) {
          // Find the latest ticket timestamp
          const latestTicket = data.reduce((latest, ticket) => {
            return new Date(ticket.timestamp) > new Date(latest.timestamp) ? ticket : latest;
          }, data[0]);
          
          setLastTicketTimestamp(latestTicket.timestamp);
        }
      }
    } catch (error) {
      // Always clear the timeout to prevent leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Don't treat aborted requests as errors
      if (error.name !== 'AbortError') {
        console.error("Error fetching tickets:", error);
        setDashboardError(error.message);
        
        // Exponential backoff for reconnecting
        const retryDelay = dashboardError ? 5000 : 2000; // Longer delay if already in error state
        
        setTimeout(() => {
          setIsTicketPolling(false);
          longPollTickets();
        }, retryDelay);
      } else {
        // This was an intentional abort, just reset polling state
        setIsTicketPolling(false);
      }
    } finally {
      if (initialLoadRef.current) {
        setDashboardLoading(false);
        initialLoadRef.current = false;
      }
      
      // Reset polling state if not set elsewhere
      if (timeoutId === null) {
        setIsTicketPolling(false);
      }
      
      // Start next long poll if not an error case
      if (!dashboardError && timeoutId === null) {
        setIsTicketPolling(false);
        longPollTickets();
      }
    }
  }, [isTicketPolling, lastTicketTimestamp, dashboardError]);

  const updateTasks = (newTickets) => {
    setTasks(prevTasks => {
      // Create a Map with existing tasks for quick lookup
      const existingTasks = new Map(prevTasks.map(task => [task.chatToken, task]));

      // Combine new tickets with existing data
      const updatedTasks = newTickets.map(ticket => ({
        ...ticket,
        ...existingTasks.get(ticket.chatToken)
      }));

      // Sort tasks by timestamp, newest first
      return updatedTasks.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    });
  };

  const setupDashboardPolling = useCallback(() => {
    // Cancel any existing long poll requests
    if (ticketAbortControllerRef.current) {
      ticketAbortControllerRef.current.abort();
    }
    
    // Reset states
    setIsTicketPolling(false);
    setLastTicketTimestamp(null);
    initialLoadRef.current = true;
    
    // Start long polling
    longPollTickets();
    
    // Cleanup function
    return () => {
      if (ticketAbortControllerRef.current) {
        ticketAbortControllerRef.current.abort();
      }
      setIsTicketPolling(false);
    };
  }, [longPollTickets]);

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDrop = (setTargetColumn, targetColumn) => {
    if (draggedTask) {
      // Remove task from all columns
      setTasks(prev => prev.filter(task => task.id !== draggedTask.id));
      setMyTasks(prev => prev.filter(task => task.id !== draggedTask.id));
      setDone(prev => prev.filter(task => task.id !== draggedTask.id));

      // Add task to target column
      setTargetColumn(prev => [...prev, draggedTask]);
      // Reset draggedTask
      setDraggedTask(null);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleTaskEdit = (taskId, newContent, setColumn) => {
    setColumn(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, content: newContent }
        : task
    ));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Inget datum";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Ogiltigt datum";
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up chat polling
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clean up dashboard polling
      if (ticketAbortControllerRef.current) {
        ticketAbortControllerRef.current.abort();
      }
    };
  }, []);

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
        setEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  // Values to be provided by the context
  const contextValue = {
    // Form state and functions
    formData,
    setFormData,
    companyType,
    setCompanyType,
    message,
    setMessage,
    isSubmitting,
    handleInputChange,
    handleFormSubmit,
    resetForm,

    // Chat state and functions
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
    handleEmojiClick,

    // Dashboard state and functions
    tasks,
    setTasks,
    myTasks,
    setMyTasks,
    done,
    setDone,
    draggedTask,
    dashboardLoading,
    dashboardError,
    setupDashboardPolling,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleTaskEdit,
    formatDate,
    longPollTickets
  };

  // Return the provider with its value
  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalContext;