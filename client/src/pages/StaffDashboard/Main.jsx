import { useState, useEffect } from "react";
import Aside from "./Aside";
import { useGlobal } from "../../GlobalContext"; // Import the global context hook

// Main dashboard component for staff members
function Main() {
  const { tickets, isLoading, errors, triggerRefresh, currentUser } = useGlobal();
  
  useEffect(() => {
    // Manually trigger a refresh of tickets when dashboard loads
    triggerRefresh('tickets');
    
    console.log("Staff Dashboard loaded, current user:", currentUser);
  }, [triggerRefresh, currentUser]);
  
  // Rest of your component
  
  return (
    <div className="dashboard-container">
      <h1>Staff Dashboard</h1>
      
      {isLoading.tickets ? (
        <p>Loading tickets...</p>
      ) : errors.tickets ? (
        <p>Error loading tickets: {errors.tickets}</p>
      ) : tickets.length === 0 ? (
        <p>No tickets found for your company.</p>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <h3>From: {ticket.sender}</h3>
              <p>Message: {ticket.message}</p>
              <p>Type: {ticket.issueType}</p>
              <p>Email: {ticket.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Main;