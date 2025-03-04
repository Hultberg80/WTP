import { useState, useEffect } from "react";

function AdminDashboard() {
  // State for all tickets/tasks
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [viewMode, setViewMode] = useState('tickets'); // 'users' or 'tickets'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Call fetch functions on initial load
  useEffect(() => {
    setError(null); // Clear previous errors
    if (viewMode === 'tickets') {
      fetchTickets();
    } else {
      fetchUsers();
    }
  }, [viewMode]);

  function printFetchError(error) {
    console.error("failed to fetch: "+error);
    setLoading(false);
  }

  function fetchTickets() {
    console.log("fetching tickets");
    setLoading(true);
    setError(null);
    
    try {
      fetch("/api/tickets", { credentials: "include" })
      .then(response => response.json(), printFetchError)
      .then(data => {
        setLoading(false);
        
        // Check if data is an error response
        if (data && data.error) {
          console.error("API error:", data.error);
          setError(data.error);
          setTickets([]);
          return;
        }
        
        // Check if data is an array before mapping
        if (Array.isArray(data)) {
          let newData = data.map(ticket => ({
            ...ticket,
            issueType: ticket.sender ? `${ticket.sender} - ${ticket.formType}` : "Okänt ärende",
            wtp: ticket.formType || "Okänd typ",
            chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
          }));
        
          setTickets(newData);
        } else {
          console.error("API returned non-array data:", data);
          setError("Oväntat svar från servern");
          setTickets([]);
        }
      }, printFetchError);
    }
    catch (error) {
      console.error("failed to fetch tickets:", error);
      setError("Ett fel uppstod vid hämtning av ärenden");
      setTickets([]);
      setLoading(false);
    }
  }

  function fetchUsers() {
    console.log("fetching users");
    setLoading(true);
    setError(null);
    
    try {
      fetch("/api/users", { credentials: "include" })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server svarade med ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setLoading(false);
        
        // Check if data is an error response
        if (data && data.error) {
          console.error("API error:", data.error);
          setError(data.error);
          setUsers([]);
          return;
        }
        
        // Check if data is an array
        if (Array.isArray(data)) {
          console.log("Received users:", data);
          
          // Standardize the property names (camelCase vs PascalCase)
          const standardizedUsers = data.map(user => ({
            id: user.id,
            firstName: user.firstName || user.FirstName,
            password: user.password || user.Password,
            company: user.company || user.Company,
            role: user.role || user.Role,
            createdAt: user.createdAt || user.CreatedAt
          }));
          
          setUsers(standardizedUsers);
        } else {
          console.error("API returned non-array data:", data);
          setError("Oväntat svar från servern");
          setUsers([]);
        }
      })
      .catch(error => {
        console.error("failed to fetch users:", error);
        setError(`Ett fel uppstod vid hämtning av användare: ${error.message}`);
        setUsers([]);
        setLoading(false);
      });
    }
    catch (error) {
      console.error("failed to fetch users:", error);
      setError("Ett fel uppstod vid hämtning av användare");
      setUsers([]);
      setLoading(false);
    }
  }

  // Function to update a user
  function updateUser(userId, user) {
    const newFirstName = prompt("Ange nytt förnamn (eller lämna tomt för att behålla):", user.firstName);
    const newPassword = prompt("Ange nytt lösenord (eller lämna tomt för att behålla):", user.password);
    const newRole = prompt("Ange ny roll (staff/admin) (eller lämna tomt för att behålla):", user.role);
    const newCompany = prompt("Ange nytt företag (eller lämna tomt för att behålla):", user.company);
  
    // If cancel was pressed on any prompt, abort the update
    if (newFirstName === null || newPassword === null || newRole === null || newCompany === null) {
      return;
    }
  
    const updatedUserData = {
      firstName: newFirstName?.trim() || user.firstName,
      password: newPassword?.trim() || user.password,
      role: newRole?.trim() || user.role,
      company: newCompany?.trim() || user.company
    };
  
    setLoading(true);
    setError(null);
    
    fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedUserData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server svarade med ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(result => {
      // Update the local state to reflect the change
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, ...updatedUserData } : u))
      );
      alert(result.message || "Användare uppdaterad");
      setLoading(false);
    })
    .catch(error => {
      console.error("Fel vid uppdatering av användare:", error);
      setError(`Fel vid uppdatering: ${error.message}`);
      setLoading(false);
    });
  }

  // Function to delete a user
  function deleteUser(userId) {
    if (!window.confirm('Är du säker på att du vill ta bort denna användare?')) {
      return;
    }

    setDeleteLoading(true);
    setError(null);
    
    fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      credentials: "include"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server svarade med ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(result => {
      // Remove the user from the local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      alert(result.message || "Användaren har tagits bort");
      setDeleteLoading(false);
    })
    .catch(error => {
      console.error('Fel vid borttagning av användare:', error);
      setError(`Fel vid borttagning: ${error.message}`);
      setDeleteLoading(false);
    });
  }

  // Formatera datum enligt svenskt format
  function formatDate(dateString) {
    if (!dateString) return "Inget datum";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Ogiltigt datum";
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Try to reconnect after connection limit error
  function handleRetry() {
    if (viewMode === 'tickets') {
      fetchTickets();
    } else {
      fetchUsers();
    }
  }

  // Filtrerar användare baserat på valt företag
  const filteredUsers = selectedCompany 
    ? users.filter(user => user.company === selectedCompany) 
    : users;

  // Filtrerar ärenden baserat på valt företag
  const filteredTickets = selectedCompany 
    ? tickets.filter(ticket => (ticket.company || ticket.wtp) === selectedCompany) 
    : tickets;

  return (
    <div className="page-container">
      <div className="view-toggle">
        <button 
          className={`toggle-button ${viewMode === 'tickets' ? 'active' : ''}`}
          onClick={() => setViewMode('tickets')}
        >
          Ärenden
        </button>
        <button 
          className={`toggle-button ${viewMode === 'users' ? 'active' : ''}`}
          onClick={() => setViewMode('users')}
        >
          Användare
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
          className="refresh-button"
          disabled={loading}
        >
          {loading ? "Laddar..." : "Uppdatera lista"}
        </button>
      </div>

      {/* Error message display */}
      {error && (
        <div className="error-banner">
          <p>Fel: {error}</p>
          {error.includes("Max client connections reached") && (
            <div>
              <p>Databasen har nått max antal anslutningar. Vänta en stund och försök igen.</p>
              <button onClick={handleRetry} disabled={loading}>
                {loading ? "Försöker igen..." : "Försök igen"}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Laddar data...</div>
      ) : viewMode === 'users' ? (
        // Visa användartabell
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Förnamn</th>
                <th>Lösenord</th>
                <th>Företag</th>
                <th>Roll</th>
                <th>Skapad</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <tr key={user.id || `user-${index}`}>
                    <td>{user.id}</td>
                    <td>{user.firstName}</td>
                    <td>{user.password}</td>
                    <td>{user.company}</td>
                    <td>{user.role}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button 
                        className="edit-button" 
                        onClick={() => updateUser(user.id, user)}
                        disabled={loading}
                      >
                        Redigera
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => deleteUser(user.id)}
                        disabled={loading || deleteLoading}
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))
              ) : !error ? (
                <tr>
                  <td colSpan="7">Inga användare hittades</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        // Visa ärendetabell
        <div className="list-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ärende</th>
                <th>Ärende Typ</th>
                <th>WTP</th>
                <th>Tidpunkt</th>
                <th>Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket, index) => (
                  <tr key={ticket.id || ticket.chatToken || `ticket-${index}`}>
                    <td>{ticket.message || 'Inget meddelande'}</td>
                    <td>{ticket.issueType || 'Ingen ärendetyp'}</td>
                    <td>{ticket.wtp || ticket.formType || 'Ingen typ'}</td>
                    <td>{formatDate(ticket.timestamp || ticket.submittedAt)}</td>
                    <td>
                      <a
                        href={ticket.chatLink || `http://localhost:3001/chat/${ticket.chatToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="open-chat-button"
                      >
                        Öppna chatt
                      </a>
                    </td>
                  </tr>
                ))
              ) : !error ? (
                <tr>
                  <td colSpan="5">Inga ärenden hittades</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;