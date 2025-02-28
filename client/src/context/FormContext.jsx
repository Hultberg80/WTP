// Form data and submissions context

import { createContext, useContext, useReducer, useState, useEffect } from 'react';

// Initial state
const initialState = {
  companyType: '',
  formData: {
    firstName: '',
    email: '',
    serviceType: '',
    issueType: '',
    message: '',
    registrationNumber: '',
    insuranceType: ''
  },
  message: { text: '', isError: false },
  isSubmitting: false,
  isSubmitted: false
};

// Create context
const FormContext = createContext(initialState);

// Action types
const ACTIONS = {
  SET_COMPANY_TYPE: 'SET_COMPANY_TYPE',
  UPDATE_FORM_DATA: 'UPDATE_FORM_DATA',
  RESET_FORM: 'RESET_FORM',
  SET_MESSAGE: 'SET_MESSAGE',
  SET_SUBMITTING: 'SET_SUBMITTING',
  SET_SUBMITTED: 'SET_SUBMITTED',
  COMPLETE_RESET: 'COMPLETE_RESET'
};

// Reducer function
function formReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_COMPANY_TYPE:
      return {
        ...state,
        companyType: action.payload
      };
    case ACTIONS.UPDATE_FORM_DATA:
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.payload
        }
      };
    case ACTIONS.RESET_FORM:
      return {
        ...initialState,
        message: state.isSubmitted ? state.message : initialState.message
      };
    case ACTIONS.COMPLETE_RESET:
      return {
        ...initialState,
        message: {
          text: 'Formuläret har skickats! Kolla din e-post för chattlänken.',
          isError: false
        }
      };
    case ACTIONS.SET_MESSAGE:
      return {
        ...state,
        message: action.payload
      };
    case ACTIONS.SET_SUBMITTING:
      return {
        ...state,
        isSubmitting: action.payload
      };
    case ACTIONS.SET_SUBMITTED:
      return {
        ...state,
        isSubmitted: action.payload
      };
    default:
      return state;
  }
}

// Provider component
export function FormProvider({ children }) {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // Reset isSubmitted after showing message for a while
  useEffect(() => {
    let timeoutId;
    
    if (state.isSubmitted) {
      timeoutId = setTimeout(() => {
        dispatch({
          type: ACTIONS.SET_SUBMITTED,
          payload: false
        });
      }, 5000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.isSubmitted]);

  const setCompanyType = (type) => {
    dispatch({
      type: ACTIONS.SET_COMPANY_TYPE,
      payload: type
    });
  };

  const updateFormData = (data) => {
    dispatch({
      type: ACTIONS.UPDATE_FORM_DATA,
      payload: data
    });
  };

  const resetForm = () => {
    dispatch({ type: ACTIONS.RESET_FORM });
  };

  const setMessage = (message, isError = false) => {
    console.log("Sätter meddelande:", message, "isError:", isError);
    dispatch({
      type: ACTIONS.SET_MESSAGE,
      payload: { text: message, isError }
    });
  };

  const setSubmitting = (isSubmitting) => {
    dispatch({
      type: ACTIONS.SET_SUBMITTING,
      payload: isSubmitting
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  const submitForm = async () => {
    // Reset any previous submission state first
    dispatch({
      type: ACTIONS.SET_SUBMITTED,
      payload: false
    });
    setSubmitting(true);
    setMessage('');
    
    let endpoint = '';
    let submitData = {
      firstName: state.formData.firstName,
      email: state.formData.email,
      companyType: state.companyType,
      message: state.formData.message,
      isChatActive: true,
      submittedAt: new Date().toISOString()
    };

    switch (state.companyType) {
      case 'Tele/Bredband':
        endpoint = '/api/tele';
        submitData = {
          ...submitData,
          serviceType: state.formData.serviceType,
          issueType: state.formData.issueType,
        };
        break;
      case 'Fordonsservice':
        endpoint = '/api/fordon';
        submitData = {
          ...submitData,
          registrationNumber: state.formData.registrationNumber,
          issueType: state.formData.issueType,
        };
        break;
      case 'Försäkringsärenden':
        endpoint = '/api/forsakring';
        submitData = {
          ...submitData,
          insuranceType: state.formData.insuranceType,
          issueType: state.formData.issueType,
        };
        break;
      default:
        setMessage('Välj ett område', true);
        setSubmitting(false);
        return false;
    }

    try {
      console.log("Skickar formulärdata till:", endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      console.log("Serverns svar:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("Formulär skickat framgångsrikt:", result);
        
        // Set success message
        setMessage('Formuläret har skickats! Kolla din e-post för chattlänken.', false);
        
        // Complete reset of form data to initial state
        dispatch({
          type: ACTIONS.COMPLETE_RESET
        });
        
        // Set submitted to true after reset (so message shows but form is clean)
        dispatch({
          type: ACTIONS.SET_SUBMITTED,
          payload: true
        });
        
        return true;
      } else {
        let errorMessage = 'Ett fel uppstod vid skickandet av formuläret';
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          console.error("Kunde inte läsa felmeddelande från servern");
        }
        
        setMessage(errorMessage, true);
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Ett fel uppstod. Vänligen försök igen eller kontakta oss via telefon.', true);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormContext.Provider
      value={{
        ...state,
        setCompanyType,
        updateFormData,
        handleInputChange,
        resetForm,
        setMessage,
        setSubmitting,
        submitForm
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

// Custom hook to use the form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};