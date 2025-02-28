// Main wrapper component for the app
// client/src/context/GlobalProvider.jsx
import { AuthProvider } from './AuthContext';
import { ChatProvider } from './ChatContext';
import { FormProvider } from './FormContext';
import { TicketProvider } from './TicketContext';

export function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <FormProvider>
        <TicketProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </TicketProvider>
      </FormProvider>
    </AuthProvider>
  );
}

