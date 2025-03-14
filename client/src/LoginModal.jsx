// Importerar useState-hook från React för att hantera komponentens state
import { useState } from 'react';
// Importerar useAuth-hook från AuthContext för att hantera autentisering och modalhantering
import { useAuth } from './AuthContext';

// Definierar LoginModal-komponenten
export default function LoginModal() {
  // Hämtar autentiseringsrelaterade värden och funktioner från AuthContext
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();
  // State för att lagra användarens e-postadress
  const [email, setEmail] = useState('');
  // State för att lagra användarens lösenord
  const [password, setPassword] = useState('');
  // State för att lagra ett eventuellt felmeddelande vid inloggning
  const [errorMessage, setErrorMessage] = useState('');
  // State för att visa laddningstillståndet (spinner/disable-knappar vid inloggning)
  const [isLoading, setIsLoading] = useState(false);

  // Om login-modalen inte är öppen, rendera inte något
  if (!isLoginModalOpen) return null;

  // Funktion som hanterar formulärets submit-händelse
  const handleSubmit = async (e) => {
    e.preventDefault(); // Förhindrar standardformulärets submit-beteende (siduppdatering)
    setErrorMessage(''); // Rensar tidigare felmeddelanden
    setIsLoading(true);  // Sätter laddningstillståndet till true

    try {
      // Försöker logga in med den angivna e-posten och lösenordet
      const result = await login(email, password);
      
      // Om inloggningen lyckades
      if (result.success) {
        setEmail('');         // Rensar e-postfältet
        setPassword('');      // Rensar lösenordsfältet
        closeLoginModal();    // Stänger login-modalen
      } else {
        // Om inloggningen misslyckades, sätt felmeddelande (använder standardmeddelande om inget finns)
        setErrorMessage(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      // Vid oväntade fel, sätt ett generellt felmeddelande
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      // Oavsett utfall, ställ in laddningstillståndet till false
      setIsLoading(false);
    }
  };

  // Renderar login-modalen
  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        {/* Modal-header med titeln "Login" och en knapp för att stänga modalen */}
        <div className="login-modal-header">
          <h2>Login</h2>
          <button 
            className="login-modal-close" 
            onClick={closeLoginModal}
            type="button"
          >
            &times;
          </button>
        </div>
        
        {/* Formulär för inloggning */}
        <form onSubmit={handleSubmit} className="login-modal-form">
          {/* Visar ett felmeddelande om errorMessage inte är tomt */}
          {errorMessage && (
            <div className="login-modal-error">
              {errorMessage}
            </div>
          )}
          
          {/* Fält för e-post */}
          <div className="login-modal-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {/* Fält för lösenord */}
          <div className="login-modal-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {/* Åtgärder: Knappar för att avbryta eller skicka formuläret */}
          <div className="login-modal-actions">
            <button
              type="button"
              onClick={closeLoginModal}
              className="login-modal-cancel"
              disabled={isLoading} // Avaktivera knappen om laddning pågår
            >
              Cancel
            </button>
            <button
              type="submit"
              className="login-modal-submit"
              disabled={isLoading} // Avaktivera knappen om laddning pågår
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}