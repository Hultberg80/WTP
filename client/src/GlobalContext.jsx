import { createContext, useContext, useState, useEffect, useRef } from 'react';

// Create a context for global state and functionality
const GlobalContext = createContext();

export function GlobalProvider({ children }) {
  // User-related state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data-related state
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState({
    tickets: 0,
    users: 0,
    chat: 0
  });
  const [isLoading, setIsLoading] = useState({
    tickets: false,
    users: false,
    chat: false
  });
  const [errors, setErrors] = useState({
    tickets: null,
    users: null,
    chat: null
  });

  // Keep track of the last fetch time for different data types
  const lastFetchTimeRef = useRef({
    tickets: 0,
    users: 0,
    chat: 0
  });

  // Check if data needs to be refreshed
  const shouldFetchData = (dataType, minInterval = 30000) => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current[dataType] >= minInterval) {
      lastFetchTimeRef.current[dataType] = now;
      return true;
    }
    return false;
  };

  // Trigger data refresh for specific data type
  const triggerRefresh = (dataType) => {
    if (dataType) {
      setRefreshTrigger(prev => ({
        ...prev,
        [dataType]: prev[dataType] + 1
      }));
      // Reset last fetch time to force a refresh
      lastFetchTimeRef.current[dataType] = 0;
    } else {
      // Refresh all data types
      setRefreshTrigger(prev => ({
        tickets: prev.tickets + 1,
        users: prev.users + 1,
        chat: prev.chat + 1
      }));
      // Reset all last fetch times
      lastFetchTimeRef.current = {
        tickets: 0,
        users: 0,
        chat: 0
      };
    }
  };

  // Authentication functions
  const login = async (username, password, rememberMe = false) => {
    setIsLoading(prev => ({ ...prev, auth: true }));
    
    try {
      // Adjusted to match your backend route
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password,
          // Include rememberMe if your backend supports it
          ...(rememberMe && { rememberMe })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();
      setCurrentUser(userData);
      setIsAuthenticated(true);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(prev => ({ ...prev, auth: false }));
    }
  };

  const logout = async () => {
    try {
      // Adjusted to match your DELETE method for logout
      await fetch('/api/login', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  // Fix the auth check function to handle empty responses
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/login');
      if (response.ok) {
        // Check if the response has content before parsing JSON
        const text = await response.text();
        if (text && text.length > 0) {
          const userData = JSON.parse(text);
          console.log('Auth check response:', userData); // Debug output
          setCurrentUser(userData);
          setIsAuthenticated(true);
        } else {
          console.log('Auth check: Empty response received');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        // If response is not OK, user is not authenticated
        console.log('Auth check: Not authenticated');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  // Check authentication status when the app loads
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fix the fetchTickets function to handle API errors better
  const fetchTickets = async () => {
    if (!isAuthenticated) {
      console.log('Not fetching tickets - user not authenticated');
      return;
    }
    
    // Don't use the shouldFetchData check for now until we get basic functionality working
    setIsLoading(prev => ({ ...prev, tickets: true }));
    setErrors(prev => ({ ...prev, tickets: null }));
    
    try {
      console.log('Fetching tickets for user:', currentUser);
      
      // Ensure the endpoint matches your actual backend API
      const endpoint = '/api/tickets';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important to include credentials
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        console.log('Empty response when fetching tickets');
        setTickets([]);
        return;
      }
      
      const data = JSON.parse(text);
      console.log('Tickets data:', data);
      
      // Transform the data based on your actual API response
      const transformedTickets = Array.isArray(data) ? data : [];
      
      setTickets(transformedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setErrors(prev => ({ ...prev, tickets: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, tickets: false }));
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    if (!shouldFetchData('users')) return;
    
    setIsLoading(prev => ({ ...prev, users: true }));
    setErrors(prev => ({ ...prev, users: null }));
    
    try {
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the data
      const transformedUsers = Array.isArray(data) ? data.map(user => ({
        id: user.id,
        firstName: user.firstName,
        email: user.email,
        company: user.company,
        role: user.role
      })) : [];
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrors(prev => ({ ...prev, users: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Update user
  const updateUser = async (userId, userData) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      const result = await response.json();
      
      // Update the users list
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...userData } : user
      ));
      
      return { success: true, message: result.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      // Remove the user from the list
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Create user
  const createUser = async (userData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      const newUser = await response.json();
      
      // Add the new user to the list
      setUsers(prev => [...prev, newUser]);
      
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Fetch data based on refresh triggers
  useEffect(() => {
    fetchTickets();
  }, [refreshTrigger.tickets]);

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger.users]);

  return (
    <GlobalContext.Provider value={{
      // Authentication
      currentUser,
      isAuthenticated,
      login,
      logout,
      
      // Data
      tickets,
      users,
      
      // Loading states
      isLoading,
      errors,
      
      // Fetch functions
      fetchTickets,
      fetchUsers,
      
      // Refresh functions
      triggerRefresh,
      shouldFetchData,
      
      // User CRUD operations
      updateUser,
      deleteUser,
      createUser
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

// Custom hook to use the global context
export function useGlobal() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
}