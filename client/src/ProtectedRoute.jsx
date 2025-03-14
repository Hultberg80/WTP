// Importerar Navigate-komponenten från react-router-dom som används för omdirigering
import { Navigate } from 'react-router-dom';
// Importerar useAuth-hooken från AuthContext för att hämta autentiseringsdata
import { useAuth } from './AuthContext';

// Definierar ProtectedRoute-komponenten som tar emot children (de komponenter som ska renderas)
// samt en optional requiredRole som anger vilken roll som krävs för att få åtkomst
function ProtectedRoute({ children, requiredRole }) {
  // Hämtar user-objektet och isLoggedIn-flaggan från AuthContext
  const { user, isLoggedIn } = useAuth();

  // Om användaren inte är inloggad, omdirigera till inloggningssidan för personal (staff)
  if (!isLoggedIn) {
    return <Navigate to="/staff/login" replace />;
  }

  // Om en specifik roll krävs och användarens roll inte matchar den, omdirigera till startsidan
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Om användaren är autentiserad och (antingen har den krävs roll eller ingen specifik roll krävs),
  // rendera de barnkomponenter som skickats in (children)
  return children;
}

// Exporterar ProtectedRoute-komponenten som standardexport
export default ProtectedRoute;