import { useState, useEffect } from 'react';

function UserAndTicketPage() {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewMode, setViewMode] = useState('users'); // 'users' or 'tickets'

  // Funktion för att hämta alla användare
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error('Något gick fel vid hämtning av användardata');
      }
      
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fel vid hämtning av användare:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funktion för att hämta alla ärenden
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/tickets");
      
      if (!response.ok) {
        throw new Error('Något gick fel vid hämtning av ärenden');
      }
      
      const data = await response.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fel vid hämtning av ärenden:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funktion för att uppdatera en användare
  const updateUser = async (userId, user) => {
    const newFirstName = prompt("Ange nytt förnamn (eller lämna tomt för att behålla):", user.firstName);
    const newPassword = prompt("Ange nytt lösenord (eller lämna tomt för att behålla):", user.password);
    const newRole = prompt("Ange ny roll (eller lämna tomt för att behålla):", user.role);
    const newCompany = prompt("Ange nytt företag (eller lämna tomt för att behålla):", user.company);
  
    const updatedUserData = {
      firstName: newFirstName?.trim() || user.firstName,  // Behåll det gamla värdet om det är tomt
      password: newPassword?.trim() || user.password,
      role: newRole?.trim() || user.role,
      company: newCompany?.trim() || user.company
    };
  
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedUserData)
      });
  
      if (!response.ok) {
        throw new Error("Något gick fel vid uppdatering av användaren");
      }
  
      const result = await response.json();
      alert(result.message);
  
      // Uppdatera UI:t
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, ...updatedUserData } : u))
      );
    } catch (err) {
      console.error("Fel vid uppdatering av användare:", err);
      alert(`Fel vid uppdatering: ${err.message}`);
    }
  };

  // Funktion för att ta bort en användare
  const deleteUser = async (userId) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna användare?')) {
      return;
    }

    try {
      setDeleteLoading(true);
      
      // Anropa API:et för att ta bort användaren
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Något gick fel vid borttagning av användaren');
      }
      
      // Ta bort användaren från lokal state för att uppdatera UI:t direkt
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      alert('Användaren har tagits bort');
    } catch (err) {
      setError(err.message);
      console.error('Fel vid borttagning av användare:', err);
      alert(`Fel vid borttagning: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Körs när komponenten laddas eller viewMode ändras
  useEffect(() => {
    if (viewMode === 'users') {
      fetchUsers();
    } else {
      fetchTickets();
    }
  }, [viewMode]);

  // Filtrerar användare baserat på valt företag
  const filteredUsers = selectedCompany 
    ? users.filter(user => user.company === selectedCompany) 
    : users;

  // Filtrerar ärenden baserat på valt företag om ärendet har ett företagsfält
  const filteredTickets = selectedCompany 
    ? tickets.filter(ticket => ticket.company === selectedCompany) 
    : tickets;

  return (
    <div className="page-container">
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

      <h1 className="page-title">
        {viewMode === 'users' ? 'Användarlista' : 'Ärendelista'}
      </h1>
      
      <div className="filter-container">
        <select 
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="filter-dropdown"
        >
          <option value="">Alla företag</option>
          <option value="fordon">fordon</option>
          <option value="tele">tele</option>
          <option value="försäkring">försäkring</option>
        </select>
        <button 
          onClick={viewMode === 'users' ? fetchUsers : fetchTickets} 
          className="refresh-button bla"
          disabled={loading}
        >
          {loading ? 'Laddar...' : 'Uppdatera lista'}
        </button>
      </div>

      {loading ? (
        <p>Laddar data...</p>
      ) : error ? (
        <p className="error-message">Fel: {error}</p>
      ) : viewMode === 'users' ? (
        // Visa användartabell
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Förnamn</th>
                <th>Lösenord</th>
                <th>Företag</th>
                <th>Roll</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.firstName}</td>
                    <td>{user.password}</td>
                    <td>{user.company}</td>
                    <td>{user.role}</td>
                    <td>
                      <button 
                        className="edit-button" 
                        onClick={() => updateUser(user.id, user)}
                      >
                        Redigera
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => deleteUser(user.id)}
                        disabled={deleteLoading}
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">Inga användare hittades</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // Visa ärendetabell
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Meddelande</th>
                <th>Tidpunkt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>{ticket.id}</td>
                    <td>{ticket.message || 'Inget meddelande'}</td>
                    <td>{new Date(ticket.timestamp).toLocaleString('sv-SE')}</td>
                    <td>{ticket.status || 'Ingen status'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Inga ärenden hittades</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UserAndTicketPage;