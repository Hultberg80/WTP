import { useState, useEffect } from 'react';
import ChatLink from '../ChatLink'; // Import ChatLink component

function UserAndTicketPage() {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewMode, setViewMode] = useState('users'); // 'users' or 'tickets'

  // Funktion för att hämta alla användare
  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        // First try to get error as text
        const errorText = await response.text();
        console.log('Server error details:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received user data:', data);
      
      // Transform the data to match your API response format
      const transformedUsers = Array.isArray(data) ? data.map(user => ({
        id: user.id,
        firstName: user.firstName,
        company: user.company,
        role: user.role,
        email: user.email,
      })) : [];
      
      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch users: ${err.message}`);
      console.error('Full error details:', err);
    } finally {
      setLoading(false);
    }
  }
  

  // Funktion för att hämta alla ärenden
  async function fetchTickets() {
    try {
      setLoading(true);
      const response = await fetch("/api/tickets");
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      const data = await response.json();
      // Transform the data to match the API response
      const transformedTickets = Array.isArray(data) ? data.map(ticket => ({
        chatToken: ticket.chatToken,
        sender: ticket.sender,
        message: ticket.message,
        timestamp: ticket.timestamp,
        issueType: ticket.issueType,
        formType: ticket.formType
      })) : [];
      
      setTickets(transformedTickets);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }
  

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
  
      // Update UI with the new data
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, ...updatedUserData } : u))
      );
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
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Något gick fel vid borttagning av användaren');
      }
      
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      alert('Användaren har tagits bort');
      
    } catch (err) {
      console.error('Delete error details:', err);
      setError(err.message);
      alert(`Fel vid borttagning: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  }
  
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
          <option value="forsakring">försäkring</option>
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
                    {/* Replace regular link with ChatLink component */}
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