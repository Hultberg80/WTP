
import { createContext, useContext, useReducer, useEffect } from 'react';

// DEVELOPMENT MODE FLAG - Set to false when login is implemented
const DEV_MODE = true;

// Initial state - Auto authenticated in dev mode
const initialState = {
  isAuthenticated: DEV_MODE, // Auto-authenticated in dev mode
  user: DEV_MODE ? 'Dev User' : null,
  role: DEV_MODE ? 'staff' : null, // 'admin', 'staff', or null
  company: DEV_MODE ? 'development' : null,
  loading: false,
  error: null
};

// Create context
const AuthContext = createContext(initialState);

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        role: action.payload.role,
        company: action.payload.company,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      // In dev mode, don't actually log out
      if (DEV_MODE) {
        return state;
      }
      return {
        ...initialState,
        isAuthenticated: false,
        user: null,
        role: null,
        company: null
      };
    default:
      return state;
  }
}

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Check for stored auth on mount (skip in dev mode)
  useEffect(() => {
    if (DEV_MODE) return;
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: userData
        });
      } catch (error) {
        console.error('Failed to parse stored auth data', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Auth methods
  const login = async (username, password, company) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    
    try {
      // In a real app, replace with actual API call
      console.log("Login attempt:", { username, password, company });
      
      // Simulate successful login (replace with actual API call)
      const userData = {
        user: username,
        role: username.includes('admin') ? 'admin' : 'staff',
        company: company
      };
      
      // Store in localStorage (skip in dev mode)
      if (!DEV_MODE) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: userData
      });
      
      return true;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message || 'Login failed'
      });
      return false;
    }
  };

  const logout = () => {
    // Skip actual logout in dev mode
    if (!DEV_MODE) {
      localStorage.removeItem('user');
    }
    dispatch({ type: 'LOGOUT' });
  };

  const createUser = async (userData) => {
    try {
      // In dev mode, just simulate success
      if (DEV_MODE) {
        console.log('DEV MODE: User created:', userData);
        return { success: true, user: userData };
      }
      
      // Replace with actual API call
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        createUser,
        DEV_MODE
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};