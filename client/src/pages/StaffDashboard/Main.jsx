// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
import { useState, useEffect, useCallback, useRef } from "react";
import Aside from "./Aside";
import { Link } from 'react-router-dom'; // Importera Link från React Router

// Definierar huvudkomponenten för applikationen
function Main() {
    // State för alla ärenden/tasks
    const [tasks, setTasks] = useState([]);
    // State för användarens egna ärenden
    const [myTasks, setMyTasks] = useState([]);
    // State för färdiga ärenden
    const [done, setDone] = useState([]);
    // State för att hålla koll på vilket ärende som dras
    const [draggedTask, setDraggedTask] = useState(null);
    // State för laddningsstatus
    const [loading, setLoading] = useState(true);
    // State för felhantering
    const [error, setError] = useState(null);
    // Referens för att hålla koll på intervallet för automatisk uppdatering
    const intervalRef = useRef(null);
    // Referens för att hålla koll på om det är första laddningen
    const initialLoadRef = useRef(true);

    const fetchTickets = useCallback(async () => {
        try {
            if (initialLoadRef.current) {
                setLoading(true);
            }
            setError(null);
    
            // Lägg till timestamp för att förhindra caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/tickets?_=${timestamp}`, {
                credentials: 'include', // Viktigt för att skicka med cookies
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (response.status === 403) {
                throw new Error('Åtkomst nekad. Vänligen logga in igen.');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            const newTickets = data.map(ticket => ({
                ...ticket,
                id: ticket.chatToken,
                issueType: `${ticket.sender} - ${ticket.formType}`,
                wtp: ticket.formType,
                chatLink: `/chat/${ticket.chatToken}`  // Relativ URL för React Router
            }));
    
            updateTasks(newTickets);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            setError(error.message);
        } finally {
            if (initialLoadRef.current) {
                setLoading(false);
                initialLoadRef.current = false;
            }
        }
    }, []);

    // Uppdaterad funktion som andra kan anropa för att uppdatera tasks
    const updateTasks = useCallback((newTickets) => {
        setTasks(prevTasks => {
            // Skapar en Map med existerande ärenden för snabb uppslagning
            const existingTasks = new Map(prevTasks.map(task => [task.chatToken, task]));

            // Kombinerar nya ärenden med existerande data
            const updatedTasks = newTickets.map(ticket => ({
                ...ticket,
                ...existingTasks.get(ticket.chatToken)
            }));

            // Sorterar ärenden efter timestamp, nyaste först
            return updatedTasks.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        });
    }, []);

    // Effekt som körs när komponenten monteras
    useEffect(() => {
        // Definiera en global funktion som kan anropas från sessionRefresh.js
        window.refreshAppData = (data) => {
            if (data && data.recentData) {
                // Uppdatera dina tasks med den nya datan
                const formattedData = data.recentData.map(ticket => ({
                    ...ticket,
                    id: ticket.chatToken,
                    issueType: `${ticket.sender} - ${ticket.formType}`,
                    wtp: ticket.formType,
                    chatLink: `/chat/${ticket.chatToken}`  // Relativ URL för React Router
                }));
                updateTasks(formattedData);
            }
        };
        
        // Hämtar ärenden direkt
        fetchTickets();

        // Rensar eventuellt existerande intervall
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Sätter upp ett nytt intervall för att hämta ärenden var 30:e sekund
        intervalRef.current = setInterval(fetchTickets, 30000);

        // Cleanup-funktion som körs när komponenten avmonteras
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            window.refreshAppData = undefined;
        };
    }, [fetchTickets, updateTasks]);

    // Funktion som körs när man börjar dra ett ärende
    const handleDragStart = (task) => {
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
    const handleDragOver = (e) => e.preventDefault();

    // Funktion för att hantera redigering av ärenden
    const handleTaskEdit = (taskId, newContent, setColumn) => {
        setColumn(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, content: newContent }
                : task
        ));
    };

    // Funktion för att formatera datum enligt svenskt format
    const formatDate = (dateString) => {
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

    // Funktion för att öppna chat i nytt fönster eller flik
    const openChat = (chatLink, event) => {
        event.preventDefault();
        window.open(chatLink, '_blank', 'noopener,noreferrer');
    };

    // Huvud-vyn för applikationen
    return (
        <div className="main-container">
            <Aside />
            
            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setTasks, tasks)}
            >
                <h2 className="ticket-tasks-header">Ärenden</h2>
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="ticket-task-item"
                    >
                        <div 
                            className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
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
                                    onClick={(e) => openChat(task.chatLink, e)}
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
                        <div 
                            className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setMyTasks)}
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
                                    onClick={(e) => openChat(task.chatLink, e)}
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
                        <div 
                            className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setDone)}
                        >
                            {task.issueType}
                        </div>
                        
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                            <div className="ticket-task-time">{formatDate(task.timestamp)}</div>
                            <div className="ticket-task-token">
                                <a
                                    href={task.chatLink}
                                    onClick={(e) => openChat(task.chatLink, e)}
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