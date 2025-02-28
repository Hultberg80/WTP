import { useState, useEffect } from "react"; // Lägg till useEffect i importen
import Aside from "./Aside";
import ChatModal from "../../pages/ChatModal";
import { useTickets, useAuth } from "../../context";

function Main() {
  const [activeChatToken, setActiveChatToken] = useState(null);
  
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

  // Endast denna minimala useEffect, inget annat
  useEffect(() => {
    fetchTickets();
  }, []);

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

  // Öppna chatmodal med specifik token
  const openChat = (token) => {
    setActiveChatToken(token);
  };

  // Stäng chatmodal
  const closeChat = () => {
    setActiveChatToken(null);
  };

  return (
    <div className="main-container">
      <Aside />

      {/* Visa ChatModal om en token är aktiv */}
      {activeChatToken && (
        <ChatModal 
          token={activeChatToken} 
          onClose={closeChat} 
        />
      )}

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
              <div className="ticket-task-time">{formatDate(task.submittedAt || task.timestamp || task.createdAt)}</div>
              <div className="ticket-task-token">
                {/* Ändra till att öppna modal istället för ny flik */}
                <button
                  onClick={() => openChat(task.chatToken || task.id)}
                  className="chat-link-button"
                >
                  Öppna chatt
                </button>
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
              <div className="ticket-task-time">{formatDate(task.submittedAt || task.timestamp || task.createdAt)}</div>
              <div className="ticket-task-token">
                {/* Ändra till att öppna modal istället för ny flik */}
                <button
                  onClick={() => openChat(task.chatToken || task.id)}
                  className="chat-link-button"
                >
                  Öppna chatt
                </button>
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
              <div className="ticket-task-time">{formatDate(task.submittedAt || task.timestamp || task.createdAt)}</div>
              <div className="ticket-task-token">
                {/* Ändra till att öppna modal istället för ny flik */}
                <button
                  onClick={() => openChat(task.chatToken || task.id)}
                  className="chat-link-button"
                >
                  Öppna chatt
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Main;