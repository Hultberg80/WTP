import React, { useEffect } from "react";
import { useGlobal } from "../../GlobalContext";

function StaffDashboard() {
  const { tickets, isLoading, errors, triggerRefresh, currentUser, isAuthenticated } = useGlobal();
  
  useEffect(() => {
    console.log("Staff Dashboard loading with auth status:", isAuthenticated);
    console.log("Current user:", currentUser);
    
    // Trigger a refresh of tickets when the dashboard loads
    triggerRefresh('tickets');
  }, [isAuthenticated, currentUser, triggerRefresh]);
  
  return (
    <div className="staff-dashboard">
      <h1>Staff Dashboard</h1>
      
      <div className="debug-info">
        <h3>Debug Info</h3>
        <p>Authentication: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>User: {currentUser ? JSON.stringify(currentUser) : 'Not logged in'}</p>
        <p>Loading: {isLoading.tickets ? 'Yes' : 'No'}</p>
        <p>Error: {errors.tickets || 'None'}</p>
      </div>
      
      {isLoading.tickets ? (
        <p>Loading tickets...</p>
      ) : errors.tickets ? (
        <div className="error-container">
          <h3>Error loading tickets</h3>
          <p>{errors.tickets}</p>
          <button onClick={() => triggerRefresh('tickets')}>Try Again</button>
        </div>
      ) : tickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <div className="tickets-container">
          <h2>Your Tickets</h2>
          {tickets.map(ticket => (
            <div className="ticket" key={ticket.id || ticket._id}>
              <h3>{ticket.subject || 'No Subject'}</h3>
              <p><strong>From:</strong> {ticket.sender || 'Unknown'}</p>
              <p><strong>Message:</strong> {ticket.message || 'No message'}</p>
              <p><strong>Type:</strong> {ticket.issueType || ticket.issue_type || 'Not specified'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StaffDashboard;