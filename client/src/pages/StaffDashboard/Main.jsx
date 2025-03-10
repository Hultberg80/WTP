import { useState, useEffect } from "react";
import Aside from "./Aside";
import { useGlobal } from "../../GlobalContext"; // Import the global context hook

// Main dashboard component for staff members
function Main() {
    // State for ticket organization and drag-and-drop
    const [pendingTickets, setPendingTickets] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [completedTickets, setCompletedTickets] = useState([]);
    const [draggedTicket, setDraggedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Get the current user from global context
    const { currentUser } = useGlobal();

    // Fetch tickets on component mount
    useEffect(() => {
        fetchCompanyTickets();
    }, [currentUser]);

    // Function to fetch tickets specific to the staff member's company
    const fetchCompanyTickets = async () => {
        if (!currentUser) return;
        
        try {
            setLoading(true);
            setError(null);
            
            // Use your existing /api/tickets endpoint
            const response = await fetch(`/api/tickets`);
            
            if (!response.ok) {
                throw new Error(`Error fetching tickets: ${response.status}`);
            }
            
            const tickets = await response.json();
            
            // Filter tickets based on company (formType matching staff's company)
            const companyTickets = tickets.filter(ticket => 
                ticket.formType?.toLowerCase() === currentUser.company?.toLowerCase()
            );
            
            // Initialize ticket columns 
            // In a real app, you might want to store status in the database
            // For now, we'll just show all tickets in the pending column
            setPendingTickets(companyTickets);
            setMyTickets([]);
            setCompletedTickets([]);
            
        } catch (error) {
            console.error("Error fetching company tickets:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle starting the drag of a ticket
    const handleDragStart = (ticket) => {
        setDraggedTicket(ticket);
    };

    // Prevent default behavior during drag over
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Handle dropping a ticket in a new column
    const handleDrop = (targetColumn) => {
        if (!draggedTicket) return;
        
        // Remove from all columns
        setPendingTickets(prev => prev.filter(t => t.chatToken !== draggedTicket.chatToken));
        setMyTickets(prev => prev.filter(t => t.chatToken !== draggedTicket.chatToken));
        setCompletedTickets(prev => prev.filter(t => t.chatToken !== draggedTicket.chatToken));
        
        // Add to target column
        if (targetColumn === 'pending') {
            setPendingTickets(prev => [...prev, draggedTicket]);
        } else if (targetColumn === 'in_progress') {
            setMyTickets(prev => [...prev, draggedTicket]);
        } else if (targetColumn === 'completed') {
            setCompletedTickets(prev => [...prev, draggedTicket]);
        }
        
        // Reset dragged ticket
        setDraggedTicket(null);
    };

    // Format date in a user-friendly way
    const formatDate = (dateString) => {
        if (!dateString) return "No date";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid date";
        return date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render a ticket item
    const renderTicketItem = (ticket, column) => (
        <div
            key={ticket.chatToken}
            draggable
            onDragStart={() => handleDragStart(ticket)}
            className="ticket-task-item"
        >
            <div className="ticket-task-content">
                {ticket.sender} - {ticket.issueType || 'No issue type'}
            </div>
            <div className="ticket-task-details">
                <div className="ticket-task-email">{ticket.email}</div>
                <div className="ticket-task-time">
                    {formatDate(ticket.timestamp)}
                </div>
                <div className="ticket-task-token">
                    <a href={`/chat/${ticket.chatToken}`}>
                        Open Chat
                    </a>
                </div>
                {ticket.message && (
                    <div className="ticket-task-message truncate-text">
                        {ticket.message}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="main-container">
            <Aside />

            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop('pending')}
            >
                <h2 className="ticket-tasks-header">New Tickets</h2>
                {loading ? (
                    <div className="loading-indicator">Loading tickets...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : pendingTickets.length === 0 ? (
                    <div className="no-tickets">No tickets available</div>
                ) : (
                    pendingTickets.map(ticket => renderTicketItem(ticket, 'pending'))
                )}
            </div>

            <div
                className="ticket-my-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop('in_progress')}
            >
                <h2 className="ticket-my-tasks-header">In Progress</h2>
                {myTickets.map(ticket => renderTicketItem(ticket, 'in_progress'))}
            </div>

            <div
                className="ticket-done"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop('completed')}
            >
                <h2 className="ticket-done-header">Completed</h2>
                {completedTickets.map(ticket => renderTicketItem(ticket, 'completed'))}
            </div>
        </div>
    );
}

export default Main;