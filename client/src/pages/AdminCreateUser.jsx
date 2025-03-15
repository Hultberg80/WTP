// Importerar useState-hooken från React för att hantera komponentens tillstånd
import { useState } from 'react';

/**
 * Komponent för att skapa nya användare i systemet (admin-funktion)
 * Presenterar ett formulär där administratörer kan ange användaruppgifter
 * och skicka dem till servern för registrering
 */
function AdminCreateUser() {
  // STATE-HANTERING FÖR FORMULÄRET
  
  // State för att lagra formulärdata - alla fält som behövs för att skapa en användare
  const [formData, setFormData] = useState({
    email: '',         // Användarens e-postadress
    firstName: '',     // Användarens förnamn (används som visningsnamn)
    password: '',      // Användarens lösenord
    company: '',       // Företaget användaren tillhör
    role: 'staff',     // Användarens roll i systemet (standardvärde: staff/kundtjänst)
  });
  
  // State för att visa meddelanden till användaren (bekräftelser eller fel)
  const [message, setMessage] = useState('');
  
  // State för att spåra om formuläret håller på att skickas (för laddningsindikation)
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  /**
   * Funktion som hanterar formulärinskickning
   * Validerar data, skickar till API, och uppdaterar UI baserat på respons
   * @param {Event} e - Formulärhändelsen som utlöses vid submit
   */
  const handleSubmit = async (e) => {
    // Förhindrar standardbeteende för formulär (sidomladdning)
    e.preventDefault();
    
    // Indikerar att formuläret håller på att skickas (aktiverar laddningstillstånd)
    setIsSubmitting(true);
    
    // Återställer eventuella tidigare meddelanden
    setMessage('');

    // Loggar data som skickas för felsökningssyfte
    console.log('Submitting form data:', formData);

    try {
      // Skickar formulärdata till API:et för att skapa en ny användare
      const response = await fetch('/api/users', {
        method: 'POST',                        // HTTP-metod för att skapa ny resurs
        headers: {
          'Content-Type': 'application/json',  // Talar om för servern att vi skickar JSON
        },
        body: JSON.stringify({                 // Konverterar JavaScript-objekt till JSON-sträng
          firstName: formData.firstName,
          password: formData.password,
          company: formData.company,
          role: formData.role,
          email: formData.email,
        })
      });

      // Loggar serverresponsen för felsökningssyfte
      console.log('Response status:', response.status);
      
      // Tolkar svarstexten som JSON
      const result = await response.json();
      console.log('Response body:', result);

      // Om API-anropet var framgångsrikt
      if (response.ok) {
        // Visar ett framgångsmeddelande för användaren
        setMessage('Användare skapades framgångsrikt!');
        
        // Återställer formuläret till ursprungligt tillstånd
        setFormData({
          email: '',
          firstName: '',
          password: '',
          company: '',
          role: 'staff',
        });
      } else {
        // Om servern svarade med ett fel, visa detaljerad felinformation
        console.error('Error response:', result);
        setMessage(result.message || JSON.stringify(result));
      }
    } catch (error) {
      // Hantera nätverksfel eller andra oväntade fel
      console.error('Fetch error:', error);
      setMessage('Ett fel uppstod vid anslutning till servern.');
    } finally {
      // Återställer inskickningsstatus oavsett om anropet lyckades eller inte
      setIsSubmitting(false);
    }
  };
  
  /**
   * Funktion för att uppdatera state när användaren ändrar något i formuläret
   * Används som händelsehanterare för alla inputfält
   * @param {Event} e - Ändringshändelsen från inputfältet
   */
  const handleInputChange = (e) => {
    // Extraherar fältnamn och nytt värde från händelsen
    const { name, value } = e.target;
    
    // Uppdaterar formData-state med det nya värdet, behåller övriga fält oförändrade
    setFormData(prev => ({
      ...prev,      // Spread operator för att behålla alla befintliga värden
      [name]: value // Dynamisk nyckel baserat på fältets namn
    }));
  };
  
  // KOMPONENTENS RENDERING - ANVÄNDARGRÄNSSNITT
  return (
    // Container med stiliserad ram för formuläret
    <div className="login-border">
      {/* Formulär med submit-hanterare */}
      <form onSubmit={handleSubmit} className="login-container">
        {/* Rubrik för formuläret */}
        <h1 className="admin-login">Skapa användare</h1>
        
        {/* Inputfält för e-postadress */}
        <input type="text"
          name='email'
          placeholder='Ange en e-postadress'
          value={formData.email}
          onChange={handleInputChange}
          className="login-bar"
          required  // Fältet måste fyllas i innan formuläret kan skickas
        />

        {/* Inputfält för användarnamn */}
        <input
          type="text"
          name="firstName"
          placeholder="Ange ett användarnamn"
          value={formData.firstName}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        {/* Inputfält för lösenord */}
        <input
          type="password"  // Döljer lösenordet med asterisker
          name="password"
          placeholder="Ange ett lösenord"
          value={formData.password}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        {/* Rullgardinsmeny för val av företag */}
        <select
          name="company"
          value={formData.company}
          onChange={handleInputChange}
          className="login-bar"
          required
        >
          <option value="">Välj företag</option>
          <option value="fordon">Fordonsservice</option>
          <option value="tele">Tele/Bredband</option>
          <option value="forsakring">Försäkringsärenden</option>
        </select>

        {/* Rullgardinsmeny för val av användarroll */}
        <select
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          className="login-bar"
          required
        >
          <option value="staff">Kundtjänst</option>
          <option value="user">Företags-admin</option>
          <option value="admin">Super-admin</option>
        </select>

        {/* Villkorlig rendering av meddelanderutan */}
        {message && (
          // Tillämpar olika stilklasser beroende på meddelandets innehåll
          <div className={message.includes('fel') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        {/* Container för submit-knappen */}
        <div className="login-knapp">
          <button
            type="submit"
            className="bla"
            disabled={isSubmitting}  // Inaktiverar knappen medan formuläret skickas
          >
            {/* Dynamisk knapptext baserat på inskickningsstatus */}
            {isSubmitting ? 'Skapar användare...' : 'Skapa användare'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Exporterar komponenten för användning i andra delar av applikationen
export default AdminCreateUser;