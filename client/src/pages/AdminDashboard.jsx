// Importerar nödvändiga React-hooks och komponenter
import { useState, useEffect } from 'react';
import ChatLink from '../ChatLink'; // Importerar ChatLink för att öppna chattar direkt från adminpanelen
import { useAuth } from '../AuthContext'; // Importerar autentiseringskontext för behörigheter

/**
 * Huvudkomponent för administratörspanelen
 * Tillhandahåller två huvudvyer: användarhantering och ärendeöversikt
 * Implementerar behörighetsbaserad åtkomstkontroll för olika administratörsroller
 */
function UserAndTicketPage() {
  // Hämtar inloggad användare från autentiseringskontexten
  // Används för att fastställa behörighetsnivåer och filterera data
  const { user } = useAuth();
  
  // STATE-HANTERING FÖR KOMPONENTENS DATA OCH TILLSTÅND
  
  const [users, setUsers] = useState([]); // Lista med användare i systemet
  const [tickets, setTickets] = useState([]); // Lista med alla ärenden
  const [loading, setLoading] = useState(true); // Indikerar om data håller på att laddas
  const [error, setError] = useState(null); // Lagrar eventuella felmeddelanden
  const [deleteLoading, setDeleteLoading] = useState(false); // Specifik laddningsindikator för borttagningsåtgärder
  const [viewMode, setViewMode] = useState('users'); // Kontrollerar vilken vy som visas: 'users' eller 'tickets'
  
  /**
   * Funktion som hämtar användarinformation från API:et
   * Implementerar behörighetsbaserad filtrering så att vanliga administratörer
   * endast ser användare från sitt eget företag
   */
  async function fetchUsers() {
    try {
      setLoading(true); // Indikerar att laddning pågår
      
      // Hämtar användardata från API:et med sessionscredentials
      const response = await fetch("/api/users", {
        credentials: "include" // Inkluderar cookies för autentiserad åtkomst
      });
      
      // Kontrollerar om API-anropet var framgångsrikt
      if (!response.ok) {
        // Försöker först hämta felmeddelande som text
        const errorText = await response.text();
        console.log('Server error details:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }
      
      // Konvertera svaret till JSON
      const data = await response.json();
      console.log('Received user data:', data);
      
      // Transformerar data för att passa komponentens format
      // Säkerställer att data är en array och extraherar relevanta fält
      const transformedUsers = Array.isArray(data) ? data.map(user => ({
        id: user.id,
        firstName: user.firstName,
        company: user.company,
        role: user.role,
        email: user.email,
      })) : [];
      
      // Filtrerar användare baserat på administratörens företag
      // Superadministratörer ser alla användare, vanliga administratörer ser endast användare från sitt företag
      const filteredByCompanyUsers = user && user.role === 'admin' && user.company 
        ? transformedUsers.filter(u => u.company === user.company)
        : transformedUsers;
      
      // Uppdaterar state med de filtrerade användarna
      setUsers(filteredByCompanyUsers);
      setError(null); // Återställer eventuella felmeddelanden
      
    } catch (err) {
      // Felhantering - sparar felmeddelande och loggar detaljer
      setError(`Failed to fetch users: ${err.message}`);
      console.error('Full error details:', err);
    } finally {
      // Avslutar laddningstillståndet oavsett om det lyckades eller inte
      setLoading(false);
    }
  }
  
  /**
   * Funktion som hämtar ärendeinformation från API:et
   * Implementerar avancerad behörighetsbaserad filtrering med flexibel matchning
   * av företagsnamn för att stödja olika format i ärendedata
   */
  async function fetchTickets() {
    try {
      setLoading(true); // Indikerar att laddning pågår
      
      // Hämtar ärendedata från API:et
      const response = await fetch("/api/tickets", {
        credentials: "include" // Inkluderar cookies för autentiserad åtkomst
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      const data = await response.json();
      
      // Transformerar data för att passa komponenten
      // Extraherar och standardiserar fält för konsekvent visning
      const transformedTickets = Array.isArray(data) ? data.map(ticket => ({
        chatToken: ticket.chatToken,
        sender: ticket.sender,
        message: ticket.message,
        timestamp: ticket.timestamp,
        issueType: ticket.issueType,
        formType: ticket.formType,
        company: ticket.company || ticket.formType // Använder formType som fallback för company
      })) : [];
      
      // Avancerad filtrering baserat på administratörens företag
      // Använder flexibel matchning för att hantera olika format i ärendetyper
      const filteredByCompanyTickets = user && user.role === 'admin' && user.company 
        ? transformedTickets.filter(t => {
            // Flexibel matchning av företagsnamn i formType-fältet
            const formType = (t.formType || '').toLowerCase();
            const userCompany = user.company.toLowerCase();
            
            // Mappar specifika företagsnamn till det som kan förekomma i formType
            // Detta hanterar olika stavningar och varianter av företagsnamn
            let searchTerms = [];
            if (userCompany === 'tele') {
              searchTerms = ['tele', 'bredband'];
            } else if (userCompany === 'fordon') {
              searchTerms = ['fordon', 'fordons'];
            } else if (userCompany === 'forsakring') {
              searchTerms = ['forsakring', 'försäkring'];
            } else {
              searchTerms = [userCompany];
            }
            
            // Kontrollerar om någon av söktermerna matchar formType
            return searchTerms.some(term => formType.includes(term));
          })
        : transformedTickets;
      
      // Uppdaterar state med de filtrerade ärendena
      setTickets(filteredByCompanyTickets);
      setError(null); // Återställer eventuella felmeddelanden
    } catch (err) {
      // Felhantering
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false); // Avslutar laddningstillståndet
    }
  }
  
  /**
   * Funktion för att uppdatera en användares uppgifter
   * Använder prompt-dialoger för att samla in ny information
   * @param {number} userId - ID för användaren som ska uppdateras
   * @param {Object} user - Befintliga användaruppgifter
   */
  async function updateUser(userId, user) {
    // Samlar användarinput via prompt-dialoger
    // Ger möjlighet att behålla befintliga värden genom att lämna fälten tomma
    const newFirstName = prompt("Ange nytt förnamn (eller lämna tomt för att behålla):", user.firstName);
    const newPassword = prompt("Ange nytt lösenord (eller lämna tomt för att behålla):", "");
    const newCompany = prompt("Ange nytt företag (eller lämna tomt för att behålla):", user.company);
    const newRole = prompt("Ange ny roll (staff/admin):", user.role);

    // Skapar ett objekt med uppdaterad användardata
    // Använder befintliga värden som fallback om inget nytt angetts
    const updatedUserData = {
        firstName: newFirstName?.trim() || user.firstName,
        password: newPassword?.trim(), // Lösenord kan vara tomt - servern hanterar detta
        company: newCompany?.trim() || user.company,
        role: newRole?.trim() || user.role
    };
  
    try {
      // Skickar uppdateringsbegäran till API:et
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT", // HTTP-metod för uppdatering
        headers: {
          "Content-Type": "application/json" // Informerar servern om att data skickas som JSON
        },
        body: JSON.stringify(updatedUserData), // Konverterar data till JSON-sträng
        credentials: "include" // Inkluderar cookies för autentiserad åtkomst
      });
  
      // Kontrollerar om uppdateringen lyckades
      if (!response.ok) {
        throw new Error("Något gick fel vid uppdatering av användaren");
      }
  
      // Läser svar från servern
      const result = await response.json();
      alert(result.message); // Visar bekräftelsemeddelande
  
      // Uppdaterar UI optimistiskt utan att behöva göra ett nytt API-anrop
      // Ersätter den användare som uppdaterades med nya data
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, ...updatedUserData } : u))
      );
    } catch (err) {
      // Felhantering
      console.error("Fel vid uppdatering av användare:", err);
      alert(`Fel vid uppdatering: ${err.message}`);
    }
  }
  
  /**
   * Funktion för att ta bort en användare från systemet
   * Inkluderar en bekräftelsedialog för att förhindra oavsiktlig borttagning
   * @param {number} userId - ID för användaren som ska tas bort
   */
  async function deleteUser(userId) {
    // Bekräftelsedialog - förhindrar oavsiktlig borttagning
    if (!window.confirm('Är du säker på att du vill ta bort denna användare?')) {
      return; // Avbryter om användaren klickar på "Avbryt"
    }
  
    try {
      // Sätter specifik laddningsindikator för borttagningsåtgärden
      setDeleteLoading(true);
      
      // Skickar borttagningsbegäran till API:et
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: "include" // Inkluderar cookies för autentiserad åtkomst
      });
      
      // Läser svar från servern
      const data = await response.json();
      
      // Kontrollerar om borttagningen lyckades
      if (!response.ok) {
        throw new Error(data.message || 'Något gick fel vid borttagning av användaren');
      }
      
      // Uppdaterar UI optimistiskt genom att filtrera bort den borttagna användaren
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      alert('Användaren har tagits bort'); // Visar bekräftelsemeddelande
      
    } catch (err) {
      // Felhantering
      console.error('Delete error details:', err);
      setError(err.message);
      alert(`Fel vid borttagning: ${err.message}`);
    } finally {
      setDeleteLoading(false); // Återställer laddningsindikatorn
    }
  }
  
  /**
   * Sidoeffekt som körs när vyläge ändras eller komponenten laddas första gången
   * Hämtar rätt data baserat på aktuell vy (användare eller ärenden)
   */
  useEffect(() => {
    // Anropar rätt hämtningsfunktion baserat på aktuell vy
    if (viewMode === 'users') {
      fetchUsers();
    } else {
      fetchTickets();
    }
  }, [viewMode]); // Körs om när vyläget ändras
  
  // KOMPONENTENS RENDERING - ANVÄNDARGRÄNSSNITT
  return (
    <div className="page-container">
      {/* Knappar för att växla mellan användarvyn och ärendevyn */}
      <div className="view-toggle">
        <button 
          className={`toggle-button ${viewMode === 'users' ? 'active' : ''}`}
          onClick={() => setViewMode('users')}
        >
          Användare
        </button>
        <button 
          className={`toggle-button ${viewMode === 'tickets' ? 'active' : ''}`}
          onClick={() => setViewMode('tickets')}
        >
          Ärenden
        </button>
      </div>

      {/* Dynamisk rubrik baserat på aktuell vy */}
      <h1 className="page-title">
        {viewMode === 'users' ? 'Användarlista' : 'Ärendelista'}
      </h1>
      
      {/* Filtrer- och uppdateringssektion */}
      <div className="filter-container">
        <button 
          onClick={viewMode === 'users' ? fetchUsers : fetchTickets} 
          className="refresh-button bla"
          disabled={loading}
        >
          {loading ? 'Laddar...' : 'Uppdatera lista'}
        </button>
      </div>

      {/* Villkorlig rendering baserat på laddningstillstånd, fel och vyläge */}
      {loading ? (
        // Visar laddningsmeddelande när data hämtas
        <p>Laddar data...</p>
      ) : error ? (
        // Visar eventuella felmeddelanden
        <p className="error-message">Fel: {error}</p>
      ) : viewMode === 'users' ? (
        // ANVÄNDARVY - Visar tabell med användarinformation
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Förnamn</th>
                <th>Email</th>
                <th>Företag</th>
                <th>Roll</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map(user => (
                // Renderar en rad för varje användare
                <tr key={user.id}>
                  <td>{user.firstName}</td>
                  <td>{user.email}</td>
                  <td>{user.company}</td>
                  <td>{user.role}</td>
                  <td>
                    {/* Åtgärdsknappar för varje användare */}
                    <button className="edit-button" onClick={() => updateUser(user.id, user)}>Redigera</button>
                    <button className="delete-button" onClick={() => deleteUser(user.id)} disabled={deleteLoading}>Ta bort</button>
                  </td>
                </tr>
              )) : (
                // Visar meddelande om inga användare hittades
                <tr><td colSpan="5">Inga användare hittades</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // ÄRENDEVY - Visar tabell med ärenden
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chat Token</th>
                <th>Sender</th>
                <th>Issue Type</th>
                <th>Form Type</th>
                <th>Message</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? tickets.map((ticket) => (
                // Renderar en rad för varje ärende
                <tr key={ticket.chatToken}>
                  <td>
                    {/* ChatLink-komponent för att öppna chatten direkt från listan */}
                    <ChatLink chatToken={ticket.chatToken}>
                      Open Chat
                    </ChatLink>
                  </td>
                  <td>{ticket.sender}</td>
                  <td>{ticket.issueType}</td>
                  <td>{ticket.formType}</td>
                  <td>{ticket.message || 'No message'}</td>
                  <td>{new Date(ticket.timestamp).toLocaleString('sv-SE')}</td>
                </tr>
              )) : (
                // Visar meddelande om inga ärenden hittades
                <tr><td colSpan="6">No tickets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Exporterar komponenten för användning i andra delar av applikationen
export default UserAndTicketPage;