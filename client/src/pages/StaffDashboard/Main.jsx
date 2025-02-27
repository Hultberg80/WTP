// client/src/pages/StaffDashboard/Main.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Aside from "./Aside";
import { useTickets, useAuth } from "../../context";

function Main() {
  const navigate = useNavigate();
  const { isAuthenticated, role, DEV_MODE } = useAuth();
  const {
    tickets,
    myTickets,
    doneTickets,
    draggedTicket,
    loading,
    error,
    fetchTickets,
    setDraggedTicket,
    moveTicket,
    updateTicket,
    formatDate
  } = useTickets();

  // Skip authentication check in dev mode
  useEffect(() => {
    if (!DEV_MODE && (!isAuthenticated || role !== 'staff')) {
      navigate('/staff/login');
    }
  }, [isAuthenticated, role, navigate, DEV_MODE]);

  // Handle drag start
  const handleDragStart = (task) => {
    setDraggedTicket(task);
  };

  // Handle drop in a column
  const handleDrop = (sourceList, targetList) => {
    if (draggedTicket) {
      moveTicket(sourceList, targetList, draggedTicket.id);
    }
  };

  // Prevent default for drag over
  const handleDragOver = (e) => e.preventDefault();

  // Handle task edit
  const handleTaskEdit = (taskId, newContent, listName) => {
    updateTicket(taskId, { issueType: newContent }, listName);
  };

  // Skip auth check in dev mode
  if (!DEV_MODE && (!isAuthenticated || role !== 'staff')) {
    return null; // Or loading indicator
  }

  return (
    <div className="main-container">
      <Aside />

      <div
        className="ticket-tasks"
        onDragOver={handleDragOver}
        onDrop={() => handleDrop('myTickets', 'tickets')}
      >
        <h2 className="ticket-tasks-header">Ärenden</h2>
        {tickets.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(task)}
            className="ticket-task-item"
          >
            <div className="ticket-task-content"
              contentEditable
              suppressContentEditableWarning={true}
              onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, 'tickets')}
            >
              {task.issueType}
            </div>
            
            <div className="ticket-task-details">
              <div className="ticket-wtp">{task.wtp}</div>
              <div className="ticket-task-email">{task.email}</div>
              <div className="ticket-task-time">{formatDate(task.submittedAt)}</div>
              <div className="ticket-task-token">
                <a
                  href={task.chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Öppna chatt
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="ticket-my-tasks"
        onDragOver={handleDragOver}
        onDrop={() => handleDrop('tickets', 'myTickets')}
      >
        <h2 className="ticket-my-tasks-header">Mina ärenden</h2>
        {myTickets.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(task)}
            className="ticket-task-item"
          >
            <div className="ticket-task-content"
              contentEditable
              suppressContentEditableWarning={true}
              onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, 'myTickets')}
            >
              {task.issueType}
            </div>
            
            <div className="ticket-task-details">
              <div className="ticket-wtp">{task.wtp}</div>
              <div className="ticket-task-email">{task.email}</div>
              <div className="ticket-task-time">{formatDate(task.submittedAt)}</div>
              <div className="ticket-task-token">
                <a
                  href={task.chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Öppna chatt
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="ticket-done"
        onDragOver={handleDragOver}
        onDrop={() => handleDrop('myTickets', 'doneTickets')}
      >
        <h2 className="ticket-done-header">Klara</h2>
        {doneTickets.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(task)}
            className="ticket-task-item"
          >
            <div className="ticket-task-content"
              contentEditable
              suppressContentEditableWarning={true}
              onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, 'doneTickets')}
            >
              {task.issueType}
            </div>
            
            <div className="ticket-task-details">
              <div className="ticket-wtp">{task.wtp}</div>
              <div className="ticket-task-time">{formatDate(task.timestamp)}</div>
              <div className="ticket-task-token">
                <a
                  href={task.chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Öppna chatt
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Main;