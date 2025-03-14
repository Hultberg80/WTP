// Importerar useState för att hantera state i komponenten
import { useState } from 'react';
// Importerar useNavigate från react-router-dom för att programmatisk navigering
import { useNavigate } from 'react-router-dom';
// Importerar CSS-filen för StaffLogin-komponenten
import './StaffLogin.css';
// Importerar useAuth-hooken från AuthContext för att få tillgång till autentiseringsfunktioner
import { useAuth } from '../AuthContext';

function StaffLogin() {
  // State för att lagra användarnamn (inmatat i formuläret)
  const [username, setUsername] = useState('');
  // State för att lagra lösenordet
  const [password, setPassword] = useState('');
  // State för att hantera "kom ihåg mig" (checkbox)
  const [rememberMe, setRememberMe] = useState(false);
  // State för att indikera om inloggningen pågår (används för att visa laddningsindikator)
  const [isLoading, setIsLoading] = useState(false);
  // State för att lagra eventuella felmeddelanden
  const [error, setError] = useState('');
  
  // Använder useNavigate för att navigera programatiskt
  const navigate = useNavigate();
  // Hämtar login-funktionen från AuthContext
  const { login } = useAuth();

  // Funktion som hanterar inloggningsformulärets submit-händelse
  const handleLogin = async (e) => {
    e.preventDefault(); // Förhindrar standardbeteendet (siduppdatering) när formuläret skickas
    setIsLoading(true); // Sätter laddningstillståndet till true
    setError(''); // Rensar eventuella tidigare felmeddelanden
    
    // Enkel validering: Kontrollera att både användarnamn och lösenord är ifyllda
    if (!username || !password) {
      setError('Vänligen fyll i både användarnamn och lösenord');
      setIsLoading(false); // Avsluta laddningstillståndet
      return; // Avbryt funktionen om valideringen misslyckas
    }
    
    try {
      // Skicka en POST-förfrågan till backend-API:t för inloggning
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Skickar inloggningsuppgifterna som JSON
        body: JSON.stringify({
          username,
          password
        })
      });
      
      // Om svaret inte är OK, kasta ett fel med ett meddelande
      if (!response.ok) {
        throw new Error('Fel användarnamn eller lösenord');
      }
      
      // Konvertera svaret från JSON
      const data = await response.json();
      
      // Anropa login-funktionen i auth-contexten för att spara användarinformation
      login(data.user);
      
      // Baserat på användarens roll, omdirigera till rätt dashboard
      if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
      
    } catch (err) {
      // Logga eventuella fel och sätt ett felmeddelande i state
      console.error('Login error:', err);
      setError('Inloggningen misslyckades. Kontrollera dina uppgifter.');
    } finally {
      // Avsluta laddningstillståndet oavsett utfall
      setIsLoading(false);
    }
  };

  return (
    // Huvudcontainer för staff login-sidan
    <div className="staff-page-container">
      <div className="staff-login-container">
        {/* Header för inloggningssidan */}
        <div className="staff-login-header">
          <h1 className="staff-login-title">Staff Portal</h1>
          <p className="staff-login-subtitle">Logga in för att fortsätta</p>
        </div>
        
        {/* Om ett felmeddelande finns, rendera en div med felmeddelandet */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Inloggningsformuläret */}
        <form onSubmit={handleLogin} className="staff-login-form">
          {/* Grupp för användarnamn */}
          <div className="staff-field-group">
            <label className="staff-field-label">Användarnamn</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)} // Uppdaterar state med inmatat värde
              className="staff-field-input"
              required
            />
          </div>
          
          {/* Grupp för lösenord */}
          <div className="staff-field-group">
            <label className="staff-field-label">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Uppdaterar state med inmatat lösenord
              className="staff-field-input"
              required
            />
          </div>
          
          {/* Alternativa inloggningsalternativ */}
          <div className="staff-login-options">
            <div className="staff-remember-container">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)} // Uppdaterar state när checkbox ändras
                className="staff-remember-checkbox"
              />
              <label htmlFor="rememberMe" className="staff-remember-label">
                Kom ihåg mig
              </label>
            </div>
            {/* Länk för glömt lösenord (visas här som en dummy-länk) */}
            <a href="#" className="staff-forgot-password">
              Glömt lösenord?
            </a>
          </div>
          
          {/* Container för inloggningsknappen */}
          <div className="staff-login-button-container">
            <button
              type="submit"
              disabled={isLoading} // Avaktivera knappen om laddning pågår
              className={`staff-login-button ${isLoading ? 'loading' : ''}`}
            >
              {/* Visa laddningstext och spinner om isLoading är true */}
              {isLoading ? (
                <span className="button-loading-text">
                  <span className="button-spinner"></span>
                  Loggar in...
                </span>
              ) : 'LOGGA IN'}
            </button>
          </div>
          
          {/* Footer med hjälptext och supportlänk */}
          <div className="staff-login-footer">
            <p className="staff-login-help">
              Behöver du hjälp? <a href="#">Kontakta support</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StaffLogin;