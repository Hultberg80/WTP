// Ticket/task management state management
// client/src/context/TicketContext.jsx
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  tickets: [],      // All tickets
  myTickets: [],    // Tickets assigned to current user
  doneTickets: [],  // Completed tickets
  draggedTicket: null,
  loading: true,
  error: null
};

// Create context
const TicketContext = createContext(initialState);

// Action types
const ACTIONS = {
  SET_TICKETS: 'SET_TICKETS',
  SET_MY_TICKETS: 'SET_MY_TICKETS',
  SET_DONE_TICKETS: 'SET_DONE_TICKETS',
  SET_DRAGGED_TICKET: 'SET_DRAGGED_TICKET',
  MOVE_TICKET: 'MOVE_TICKET',
  UPDATE_TICKET: 'UPDATE_TICKET',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer function
function ticketReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_TICKETS:
      return {
        ...state,
        tickets: action.payload,
        loading: false
      };
    case ACTIONS.SET_MY_TICKETS:
      return {
        ...state,
        myTickets: action.payload
      };
    case ACTIONS.SET_DONE_TICKETS:
      return {
        ...state,
        doneTickets: action.payload
      };
    case ACTIONS.SET_DRAGGED_TICKET:
      return {
        ...state,
        draggedTicket: action.payload
      };
    case ACTIONS.MOVE_TICKET: {
      const { source, destination, ticketId } = action.payload;
      // First, remove the ticket from the source list
      const updatedSourceList = state[source].filter(ticket => ticket.id !== ticketId);
      
      // Find the ticket in all lists
      const ticket = state.tickets.find(t => t.id === ticketId) || 
                    state.myTickets.find(t => t.id === ticketId) ||
                    state.doneTickets.find(t => t.id === ticketId);
      
      if (!ticket) return state;
      
      // Add the ticket to the destination list
      const updatedDestinationList = [...state[destination], ticket];
      
      return {
        ...state,
        [source]: updatedSourceList,
        [destination]: updatedDestinationList
      };
    }
    case ACTIONS.UPDATE_TICKET: {
      const { ticketId, updates, listName } = action.payload;
      const updatedList = state[listName].map(ticket =>
        ticket.id === ticketId ? { ...ticket, ...updates } : ticket
      );
      
      return {
        ...state,
        [listName]: updatedList
      };
    }
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    default:
      return state;
  }
}

// Provider component
export function TicketProvider({ children }) {
  const [state, dispatch] = useReducer(ticketReducer, initialState);
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef(null);
  const initialLoadRef = useRef(true);
  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      if (initialLoadRef.current) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      }
      
      dispatch({ type: ACTIONS.SET_ERROR, payload: null });
      
      const response = await fetch('/api/tickets', {
        credentials: 'include', 
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Handle errors more gracefully
      if (response.status === 403) {
        console.error('Access denied when fetching tickets');
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Åtkomst nekad. Vänligen logga in igen.' });
        return; // Return without throwing
      }
      
      if (!response.ok) {
        console.error(`Ticket fetch failed with status: ${response.status}`);
        dispatch({ type: ACTIONS.SET_ERROR, payload: `HTTP error! status: ${response.status}` });
        return; // Return without throwing
      }
      
      const data = await response.json();
      
      const formattedTickets = data.map(ticket => ({
        ...ticket,
        id: ticket.chatToken,
        issueType: `${ticket.sender} - ${ticket.formType}`,
        wtp: ticket.formType,
        chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
      }));
      
      dispatch({ 
        type: ACTIONS.SET_TICKETS, 
        payload: formattedTickets.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        ) 
      });
      
    } catch (error) {
      console.error("Error fetching tickets:", error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      // Don't rethrow - just report the error
    } finally {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }
  }, [isAuthenticated]);
  const setDraggedTicket = (ticket) => {
    dispatch({ 
      type: ACTIONS.SET_DRAGGED_TICKET, 
      payload: ticket 
    });
  };

  const moveTicket = (sourceList, destinationList, ticketId) => {
    dispatch({
      type: ACTIONS.MOVE_TICKET,
      payload: {
        source: sourceList,
        destination: destinationList,
        ticketId
      }
    });
  };

  const updateTicket = (ticketId, updates, listName) => {
    dispatch({
      type: ACTIONS.UPDATE_TICKET,
      payload: {
        ticketId,
        updates,
        listName
      }
    });
  };

  // Format date helper
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

  return (
    <TicketContext.Provider
      value={{
        ...state,
        fetchTickets,
        setDraggedTicket,
        moveTicket,
        updateTicket,
        formatDate
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

// Custom hook to use the ticket context
export const useTickets = () => {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
