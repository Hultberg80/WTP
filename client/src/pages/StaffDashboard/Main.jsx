// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
import { useState, useEffect } from "react";
import Aside from "./Aside";
import ChatLink from "../../ChatLink"; // Import the ChatLink component

// Definierar huvudkomponenten för applikationen
function Main() {
    // State för alla ärenden/tasks
    const render_again = false;
    const [tasks, setTasks] = useState([]);
    // State för användarens egna ärenden
    const [myTasks, setMyTasks] = useState([]);
    // State för färdiga ärenden
    const [done, setDone] = useState([]);
    // State för att hålla koll på vilket ärende som dras
    const [draggedTask, setDraggedTask] = useState(null);
    // State för att hålla reda på besökta ärenden
    const [visitedChats, setVisitedChats] = useState(() => {
        // Hämta besökta chattar från localStorage om de finns
        const saved = localStorage.getItem('visitedChats');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(fetchAllTickets, []);
    
    // Spara besökta chattar i localStorage när de uppdateras
    useEffect(() => {
        localStorage.setItem('visitedChats', JSON.stringify(visitedChats));
    }, [visitedChats]);
    
    function printFetchError(error)
    {
        console.error("failed to fetch tickets: "+error);
    }

    function fetchAllTickets() {
        console.log("fetching tickets");
        try {
          fetch("/api/tickets", { credentials: "include" })
            .then(response => response.json(), printFetchError)
            .then(data => {
              // Define what makes a ticket "new" - for example, created in the last 24 hours
              const currentTime = new Date();
              const newTicketThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
              
              let newData = data.map(ticket => {
                // Använd det första tillgängliga datumfältet
                const ticketDate = ticket.submittedAt || ticket.timestamp || ticket.createdAt;
                const ticketTime = new Date(ticketDate);
                
                // Kontrollera om detta ärende har besökts tidigare
                const hasBeenVisited = visitedChats[ticket.chatToken] === true;
                
                // Ett ärende är nytt om det är nyligen skapat OCH inte har besökts
                const isNew = !hasBeenVisited && 
                              ticketTime && 
                              !isNaN(ticketTime.getTime()) && 
                              (currentTime - ticketTime) < newTicketThreshold;
                
                return {
                  ...ticket,
                  issueType: `${ticket.sender} - ${ticket.formType}`,
                  wtp: ticket.formType,
                  chatToken: ticket.chatToken,
                  chatLink: `http://localhost:3001/chat/${ticket.chatToken}`,
                  isNew: isNew, // Add a flag indicating if the ticket is new
                  statusCircle: isNew ? "green" : "gray" // Add a visual indicator color
                };
              });
              
              setTasks(newData);
            }, printFetchError);
        } catch {
          console.error("failed to fetch tickets");
        }
      }


    // Funktion för att uppdatera ärendelistan med ny data
    
    // Funktion som körs när man börjar dra ett ärende
    function handleDragStart(task){
        setDraggedTask(task);
    };

    // Funktion som körs när man släpper ett ärende i en ny kolumn
    const handleDrop = (setTargetColumn, targetColumn) => {
        if (draggedTask) {
            // Tar bort ärendet från alla kolumner
            setTasks(prev => prev.filter(task => task.id !== draggedTask.id));
            setMyTasks(prev => prev.filter(task => task.id !== draggedTask.id));
            setDone(prev => prev.filter(task => task.id !== draggedTask.id));

            // Lägger till ärendet i målkolumnen
            setTargetColumn(prev => [...prev, draggedTask]);
            // Återställer draggedTask
            setDraggedTask(null);
        }
    };

    // Förhindrar standardbeteende vid drag-over
    function handleDragOver(e){e.preventDefault()};

    // Funktion för att hantera redigering av ärenden
    function handleTaskEdit(taskId, newContent, setColumn){
        setColumn(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, content: newContent }
                : task
        ));
    };

    // Funktion för att formatera datum enligt svenskt format
    function formatDate (dateString){
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
    };

    // Funktion för att rendera statuscirkel
    function renderStatusCircle(status) {
        return (
            <div 
                className="status-circle" 
                style={{ 
                    backgroundColor: status,
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    display: "inline-block",
                    marginRight: "8px"
                }}
            ></div>
        );
    }
    
    // Funktion för att markera ett ärende som besökt när chatlänken klickas
    function handleChatLinkClick(chatToken) {
        // Markera chatten som besökt
        setVisitedChats(prev => ({
            ...prev,
            [chatToken]: true
        }));
        
        // Uppdatera tasks state för att ändra cirkelns färg
        setTasks(prev => prev.map(task => 
            task.chatToken === chatToken 
                ? { ...task, isNew: false, statusCircle: "gray" } 
                : task
        ));
        
        // Uppdatera även myTasks om ärendet finns där
        setMyTasks(prev => prev.map(task => 
            task.chatToken === chatToken 
                ? { ...task, isNew: false, statusCircle: "gray" } 
                : task
        ));
        
        // Uppdatera även done om ärendet finns där
        setDone(prev => prev.map(task => 
            task.chatToken === chatToken 
                ? { ...task, isNew: false, statusCircle: "gray" } 
                : task
        ));
    }

    // Huvudvy för applikationen
    return (
        // Huvudcontainer
        <div className="main-container">
            
            <Aside />

            
            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setTasks, tasks)}
            >
                <h2 className="ticket-tasks-header">Ärenden</h2>
                {tasks.map((task) => (
                    // Container för varje ärende
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="ticket-task-item"
                    >
                        
                        <div className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
                        >
                            {renderStatusCircle(task.statusCircle)}
                            {task.issueType}
                        </div>
                        
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                            <div className="ticket-task-email">{task.email}</div>
                        <div className="ticket-task-time">
                            {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                        </div>
                            <div className="ticket-task-token">
                                {/* Modifierad ChatLink med onClick callback */}
                                <ChatLink 
                                    chatToken={task.chatToken}
                                    onClick={() => handleChatLinkClick(task.chatToken)}
                                >
                                    Öppna chatt
                                </ChatLink>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            
            <div
                className="ticket-my-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setMyTasks, myTasks)}
            >
                <h2 className="ticket-my-tasks-header">Mina ärenden</h2>
                {myTasks.map((task) => (
                    
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="ticket-task-item"
                    >
                        
                        <div className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setMyTasks)}
                        >
                            {renderStatusCircle(task.statusCircle)}
                            {task.issueType}
                        </div>
                        
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                            <div className="ticket-task-email">{task.email}</div>
                        <div className="ticket-task-time">
                            {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                        </div>
                            <div className="ticket-task-token">
                                {/* Modifierad ChatLink med onClick callback */}
                                <ChatLink 
                                    chatToken={task.chatToken}
                                    onClick={() => handleChatLinkClick(task.chatToken)}
                                >
                                    Öppna chatt
                                </ChatLink>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

           
            <div
                className="ticket-done"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setDone, done)}
            >
                <h2 className="ticket-done-header">Klara</h2>
                {done.map((task) => (
                    
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="ticket-task-item"
                    >
                        
                        <div className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setDone)}
                        >
                            {renderStatusCircle(task.statusCircle)}
                            {task.issueType}
                        </div>
                        
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                        <div className="ticket-task-time">
                            {formatDate(task.submittedAt  || task.timestamp || task.createdAt)}
                        </div>
                            <div className="ticket-task-token">
                                {/* Modifierad ChatLink med onClick callback */}
                                <ChatLink 
                                    chatToken={task.chatToken}
                                    onClick={() => handleChatLinkClick(task.chatToken)}
                                >
                                    Öppna chatt
                                </ChatLink>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Exporterar Main-komponenten som default export
export default Main;