// Importerar nödvändiga React hooks för state-hantering, sidoeffekter och referenser
import { useState, useEffect } from "react";
import Aside from "./Aside";
import ChatLink from "../../ChatLink"; // Import the ChatLink component

// Definierar huvudkomponenten för applikationen
function Main() {
    // State för alla ärenden/tasks
    const [tasks, setTasks] = useState(() => {
        // Try to get tasks from localStorage on initial render
        const savedTasks = localStorage.getItem('tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    
    // State för användarens egna ärenden
    const [myTasks, setMyTasks] = useState(() => {
        // Try to get myTasks from localStorage on initial render
        const savedMyTasks = localStorage.getItem('myTasks');
        return savedMyTasks ? JSON.parse(savedMyTasks) : [];
    });
    
    // State för färdiga ärenden
    const [done, setDone] = useState(() => {
        // Try to get done tasks from localStorage on initial render
        const savedDone = localStorage.getItem('done');
        return savedDone ? JSON.parse(savedDone) : [];
    });
    
    // State för att hålla koll på vilka ärenden som har visats/lästs
    const [viewedTickets, setViewedTickets] = useState(() => {
        const savedViewedTickets = localStorage.getItem('viewedTickets');
        return savedViewedTickets ? JSON.parse(savedViewedTickets) : {};
    });
    
    // State för att hålla koll på vilket ärende som dras
    const [draggedTask, setDraggedTask] = useState(null);

    // Save tasks state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    // Save myTasks state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('myTasks', JSON.stringify(myTasks));
    }, [myTasks]);

    // Save done state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('done', JSON.stringify(done));
    }, [done]);
    
    // Save viewedTickets state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('viewedTickets', JSON.stringify(viewedTickets));
    }, [viewedTickets]);

    useEffect(() => {
        fetchAllTickets();
    }, []);

    function printFetchError(error) {
        console.error("failed to fetch tickets: " + error);
    }

    function fetchAllTickets() {
        console.log("fetching tickets");
        try {
            fetch("/api/tickets", { credentials: "include" })
                .then(response => response.json(), printFetchError)
                .then(data => {
                    // Transform the data
                    let newData = data.map(ticket => ({
                        ...ticket,
                        id: ticket.id || ticket.chatToken, // Ensure each item has an id
                        issueType: `${ticket.sender} - ${ticket.formType}`,
                        wtp: ticket.issueType,
                        chatToken: ticket.chatToken,
                        chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
                    }));

                    // Create a set of IDs that are in myTasks or done
                    const myTasksIds = new Set(myTasks.map(task => task.id || task.chatToken));
                    const doneIds = new Set(done.map(task => task.id || task.chatToken));
                    
                    // Filter out any tickets that are already in myTasks or done
                    const filteredTasks = newData.filter(task => {
                        const taskId = task.id || task.chatToken;
                        return !myTasksIds.has(taskId) && !doneIds.has(taskId);
                    });
                    
                    setTasks(filteredTasks);

                }, printFetchError);
        } catch (error) {
            console.error("failed to fetch tickets:", error);
        }
    }

    // Funktion som körs när man börjar dra ett ärende
    function handleDragStart(task) {
        setDraggedTask(task);
    }

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
    function handleDragOver(e) { e.preventDefault() };

    // Funktion för att hantera redigering av ärenden
    function handleTaskEdit(taskId, newContent, setColumn) {
        setColumn(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, content: newContent }
                : task
        ));
    }
    
    // Funktion för att markera ett ärende som visat/läst
    function markAsViewed(taskId) {
        setViewedTickets(prev => ({
            ...prev,
            [taskId]: true
        }));
    }

    // Funktion för att formatera datum enligt svenskt format
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
    
    // Funktion för att kontrollera om ett ärende är nytt (inte visat)
    function isNewTicket(taskId) {
        return !viewedTickets[taskId];
    }

    // Huvudvy för applikationen
    return (
        // Huvudcontainer
        <div className="main-container">
            <Aside />

            <div className="ticket-tasks" onDragOver={handleDragOver} onDrop={() => handleDrop(setTasks, tasks)}>
                <h2 className="ticket-tasks-header">Ärenden</h2>
                <div className="ticket-items-wrapper">
                    <div className="ticket-items-container">
                        {tasks.map((task) => (
                            // Container för varje ärende
                            <div
                                key={task.id || task.chatToken}
                                draggable
                                onDragStart={() => handleDragStart(task)}
                                className={`ticket-task-item ${isNewTicket(task.id) ? 'new-ticket' : ''}`}
                            >
                                <div className="ticket-task-content"
                                    contentEditable
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
                                >
                                    {task.issueType}
                                </div>
                                
                                {isNewTicket(task.id) && (
                                    <div className="new-ticket-badge">Ny</div>
                                )}

                                <div className="ticket-task-details">
                                    <div className="ticket-wtp">{task.wtp}</div>
                                    <div className="ticket-task-email">{task.email}</div>
                                    <div className="ticket-task-time">
                                        {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                                    </div>
                                    <div className="ticket-task-token">
                                        {/* Using ChatLink component with onClick to mark as viewed */}
                                        <ChatLink 
                                            chatToken={task.chatToken}
                                            onClick={() => markAsViewed(task.id)}
                                        >
                                            Öppna chatt
                                        </ChatLink>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="ticket-my-tasks" onDragOver={handleDragOver} onDrop={() => handleDrop(setMyTasks, myTasks)}>
                <h2 className="ticket-my-tasks-header">Mina ärenden</h2>
                <div className="ticket-items-wrapper">
                    <div className="ticket-items-container">
                        {myTasks.map((task) => (
                            <div
                                key={task.id || task.chatToken}
                                draggable
                                onDragStart={() => handleDragStart(task)}
                                className={`ticket-task-item ${isNewTicket(task.id) ? 'new-ticket' : ''}`}
                            >
                                <div className="ticket-task-content"
                                    contentEditable
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setMyTasks)}
                                >
                                    {task.issueType}
                                </div>
                                
                                {isNewTicket(task.id) && (
                                    <div className="new-ticket-badge">Ny</div>
                                )}

                                <div className="ticket-task-details">
                                    <div className="ticket-wtp">{task.wtp}</div>
                                    <div className="ticket-task-email">{task.email}</div>
                                    <div className="ticket-task-time">
                                        {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                                    </div>
                                    <div className="ticket-task-token">
                                        <ChatLink 
                                            chatToken={task.chatToken}
                                            onClick={() => markAsViewed(task.id)}
                                        >
                                            Öppna chatt
                                        </ChatLink>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="ticket-done" onDragOver={handleDragOver} onDrop={() => handleDrop(setDone, done)}>
                <h2 className="ticket-done-header">Klara</h2>
                <div className="ticket-items-wrapper">
                    <div className="ticket-items-container">
                        {done.map((task) => (
                            <div
                                key={task.id || task.chatToken}
                                draggable
                                onDragStart={() => handleDragStart(task)}
                                className="ticket-task-item"
                            >
                                <div className="ticket-task-content"
                                    contentEditable
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setDone)}
                                >
                                    {task.issueType}
                                </div>

                                <div className="ticket-task-details">
                                    <div className="ticket-wtp">{task.wtp}</div>
                                    <div className="ticket-task-time">
                                        {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                                    </div>
                                    <div className="ticket-task-token">
                                        <ChatLink chatToken={task.chatToken}>
                                            Öppna chatt
                                        </ChatLink>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Exporterar Main-komponenten som default export
export default Main;