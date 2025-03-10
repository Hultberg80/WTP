import { useState, useEffect } from 'react';
import { useGlobal } from '../GlobalContext'; // Import the global context hook

function UserAndTicketPage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [viewMode, setViewMode] = useState('users'); // 'users' or 'tickets'
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Use the global context for shared state and functions
  const { 
    users, 
    tickets, 
    isLoading, 
    errors, 
    fetchUsers, 
    fetchTickets, 
    updateUser: updateUserGlobal, 
    deleteUser: deleteUserGlobal,
    triggerRefresh
  } = useGlobal();

  // Körs när komponenten laddas eller viewMode ändras
  useEffect(() => {
    if (viewMode === 'users') {
      triggerRefresh('users');
    } else {
      triggerRefresh('tickets');
    }
  }, [viewMode, triggerRefresh]);

  // Funktion för att uppdatera en användare
  async function updateUser(userId, user) {
    const newFirstName = prompt("Ange nytt förnamn (eller lämna tomt för att behålla):", user.firstName);
    const newPassword = prompt("Ange nytt lösenord (eller lämna tomt för att behålla):", "");
    const newCompany = prompt("Ange nytt företag (eller lämna tomt för att behålla):", user.company);
    const newRole = prompt("Ange ny roll (staff/admin):", user.role);

    const updatedUserData = {
        firstName: newFirstName?.trim() || user.firstName,
        password: newPassword?.trim(),
        company: newCompany?.trim() || user.company,
        role: newRole?.trim() || user.role
    };
  
    try {
      const result = await updateUserGlobal(userId, updatedUserData);
      
      if (result.success) {
        alert(result.message || 'Användaren uppdaterades');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Fel vid uppdatering av användare:", err);
      alert(`Fel vid uppdatering: ${err.message}`);
    }
  }

  // Funktion för att ta bort en användare
  async function deleteUser(userId) {
    if (!window.confirm('Är du säker på att du vill ta bort denna användare?')) {
      return;
    }
  
    try {
      setDeleteLoading(true);
      
      const result = await deleteUserGlobal(userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Något gick fel vid borttagning av användaren');
      }
      
      alert('Användaren har tagits bort');
      
    } catch (err) {
      console.error('Delete error details:', err);
      alert(`Fel vid borttagning: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Filtrerar användare baserat på valt företag
  const filteredUsers = selectedCompany 
    ? users.filter(user => user.company === selectedCompany) 
    : users;

  // Filtrerar ärenden baserat på valt företag om ärendet har ett företagsfält
  const filteredTickets = selectedCompany 
    ? tickets.filter(ticket => ticket.formType === selectedCompany) 
    : tickets;

  const loading = isLoading.users || isLoading.tickets;
  const error = errors.users || errors.tickets;

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
          <option value="forsakring">försäkring</option>
        </select>
        <button 
          onClick={() => viewMode === 'users' ? triggerRefresh('users') : triggerRefresh('tickets')} 
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
                <th>Email</th>
                <th>Företag</th>
                <th>Roll</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.firstName}</td>
                  <td>{user.email}</td>
                  <td>{user.company}</td>
                  <td>{user.role}</td>
                  <td>
                    <button className="edit-button" onClick={() => updateUser(user.id, user)}>Redigera</button>
                    <button className="delete-button" onClick={() => deleteUser(user.id)} disabled={deleteLoading}>Ta bort</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5">Inga användare hittades</td></tr>
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
                <th>Chat Token</th>
                <th>Sender</th>
                <th>Issue Type</th>
                <th>Form Type</th>
                <th>Message</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                <tr key={ticket.chatToken}>
                  <td>
                    <a href={`/chat/${ticket.chatToken}`}>
                      Open Chat
                    </a>
                  </td>
                  <td>{ticket.sender}</td>
                  <td>{ticket.issueType}</td>
                  <td>{ticket.formType}</td>
                  <td className="truncate-text">{ticket.message || 'No message'}</td>
                  <td>{new Date(ticket.timestamp).toLocaleString('sv-SE')}</td>
                </tr>
              )) : (
                <tr><td colSpan="6">No tickets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UserAndTicketPage;