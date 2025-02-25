import { useState, useEffect, useCallback, useRef } from "react";
import Aside from "./Aside";

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
    // State för att visa om uppdatering pågår
    const [isUpdating, setIsUpdating] = useState(false);
    // State för att räkna återanslutningsförsök
    const [retryCount, setRetryCount] = useState(0);
    // Referens för att hålla koll på intervallet för automatisk uppdatering
    const intervalRef = useRef(null);
    // Referens för timerRef för återförsök
    const timerRef = useRef(null);
    // Referens för att hålla koll på om det är första laddningen
    const initialLoadRef = useRef(true);
    // Timestamp för senaste uppdateringen
    const [lastUpdate, setLastUpdate] = useState(null);
    // Cache för befintliga ID för att bevara drag/drop tillstånd
    const tasksCacheRef = useRef(new Map());

    // Förbättrad fetchTickets-funktion med robust felhantering
    const fetchTickets = useCallback(async (silent = false) => {
        try {
            if (initialLoadRef.current && !silent) {
                setLoading(true);
            }
            
            if (!silent) {
                setIsUpdating(true);
            }
            
            setError(null);
            
            // Avbryt alla pågående återförsökstimers
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
    
            console.log("Fetching tickets...");
            const response = await fetch('/api/tickets', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            // Handle 500 errors specifically, which are common
            if (response.status === 500) {
                console.warn("Server returned 500 error");
                let errorText = "Serverfel. Försöker igen...";
                
                try {
                    // Try to read more details about the error
                    const errorBody = await response.text();
                    console.error("Server error details:", errorBody);
                } catch (readError) {
                    console.error("Could not read error details:", readError);
                }
                
                throw new Error(errorText);
            }
            
            if (response.status === 403) {
                throw new Error('Åtkomst nekad. Vänligen logga in igen.');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error("Unexpected data format:", data);
                throw new Error("Oväntad datastruktur från servern");
            }
            
            const newTickets = data.map(ticket => ({
                ...ticket,
                id: ticket.chatToken || `ticket-${Math.random().toString(36).substring(2, 9)}`,
                issueType: ticket.sender 
                    ? `${ticket.sender} - ${ticket.formType || 'Okänd typ'}`
                    : 'Okänd avsändare',
                wtp: ticket.formType || 'Okategoriserad',
                email: ticket.email || 'Ingen e-post',
                chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
            }));
    
            updateTasks(newTickets);
            
            // Uppdatera senaste uppdateringstiden
            setLastUpdate(new Date());
            
            // Återställ återförsöksräknaren vid framgång
            setRetryCount(0);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            
            if (!silent) {
                setError(error.message || "Ett fel uppstod vid hämtning av ärenden");
            }
            
            // Öka återförsöksräknaren
            setRetryCount(prev => prev + 1);
            
            // Schemalägg ett nytt försök med exponentiell backoff
            const backoffTime = Math.min(3000 * Math.pow(1.5, retryCount), 20000);
            console.log(`Will retry in ${backoffTime/1000} seconds...`);
            
            timerRef.current = setTimeout(() => {
                console.log("Attempting retry...");
                fetchTickets(true);
            }, backoffTime);
        } finally {
            if (initialLoadRef.current && !silent) {
                setLoading(false);
                initialLoadRef.current = false;
            }
            
            if (!silent) {
                setIsUpdating(false);
            }
        }
    }, [retryCount]);

    // Effekt som körs när komponenten monteras
    useEffect(() => {
        console.log("Component mounted, fetching tickets...");
        fetchTickets();

        // Rensar eventuellt existerande intervall
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Sätter upp ett nytt intervall för att hämta ärenden var 10:e sekund
        intervalRef.current = setInterval(() => {
            console.log("Auto-refresh interval triggered");
            fetchTickets(true);
        }, 10000);

        // Cleanup-funktion som körs när komponenten avmonteras
        return () => {
            console.log("Component unmounting, clearing intervals...");
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [fetchTickets]);

    // Funktion för att uppdatera ärendelistan med ny data men behålla drag-and-drop tillstånd
    const updateTasks = (newTickets) => {
        // Spara current drag/drop state
        const myTasksIds = new Set(myTasks.map(t => t.id));
        const doneTasksIds = new Set(done.map(t => t.id));
        
        setTasks(prevTasks => {
            // Först kombinera ny data med befintlig metadata/redigeringar
            const existingTasks = new Map();
            prevTasks.forEach(task => {
                existingTasks.set(task.id, task);
                // Spara också i en persistent cache för alla sessioner
                tasksCacheRef.current.set(task.id, {
                    content: task.content, // Redigerat innehåll
                    lastModified: task.lastModified
                });
            });

            // Uppdatera/lägg till nya tickets, men behåll redigerad data
            const updatedTickets = newTickets
                .filter(ticket => {
                    // Filtrera bort tickets som redan finns i myTasks eller done
                    return !myTasksIds.has(ticket.id) && !doneTasksIds.has(ticket.id);
                })
                .map(ticket => {
                    const existingTask = existingTasks.get(ticket.id);
                    const cachedData = tasksCacheRef.current.get(ticket.id);
                    
                    // Kombinera ny data med befintlig eller cache
                    return {
                        ...ticket,
                        content: (existingTask?.content || cachedData?.content || ticket.content || ticket.issueType),
                        lastModified: (existingTask?.lastModified || cachedData?.lastModified || ticket.timestamp)
                    };
                });

            // Sortera tickets, nyaste först
            return updatedTickets.sort((a, b) => {
                const timeA = new Date(a.lastModified || a.timestamp || 0);
                const timeB = new Date(b.lastModified || b.timestamp || 0);
                return timeB - timeA;
            });
        });
    };

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

            // Lägger till ärendet i målkolumnen med uppdaterad tid
            const now = new Date();
            setTargetColumn(prev => [
                {
                    ...draggedTask, 
                    lastModified: now.toISOString(),
                    movedAt: now.toISOString()
                },
                ...prev
            ]);
            
            // Spara i cachen
            tasksCacheRef.current.set(draggedTask.id, {
                content: draggedTask.content,
                lastModified: now.toISOString()
            });
            
            // Återställer draggedTask
            setDraggedTask(null);
        }
    };

    // Förhindrar standardbeteende vid drag-over
    const handleDragOver = (e) => e.preventDefault();

    // Funktion för att hantera redigering av ärenden
    const handleTaskEdit = (taskId, newContent, setColumn) => {
        setColumn(prev => prev.map(task => {
            if (task.id === taskId) {
                const updatedTask = { 
                    ...task, 
                    content: newContent,
                    lastModified: new Date().toISOString()
                };
                
                // Uppdatera också i cache
                tasksCacheRef.current.set(taskId, {
                    content: newContent,
                    lastModified: new Date().toISOString()
                });
                
                return updatedTask;
            }
            return task;
        }));
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

    // Manuell uppdateringsknapp
    const handleManualRefresh = () => {
        fetchTickets();
    };

    // Visa laddningsindikator
    if (loading) {
        return (
            <div className="main-container">
                <Aside />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Laddar ärenden...</p>
                </div>
            </div>
        );
    }

    // Visa felmeddelande vid kritiska problem
    if (error && retryCount > 5) {
        return (
            <div className="main-container">
                <Aside />
                <div className="error-container">
                    <h2>Problem att ansluta till servern</h2>
                    <p>{error}</p>
                    <p>Försök: {retryCount}</p>
                    <button onClick={handleManualRefresh} className="refresh-button">
                        Försök igen
                    </button>
                </div>
            </div>
        );
    }

    // Huvudvy för applikationen - visa även om det finns fel, men med varning
    return (
        <div className="main-container">
            <Aside />

            {/* Status bar med senaste uppdatering och återanslutningsinfo */}
            <div className="status-bar" style={{ 
                gridColumn: '2 / span 3', 
                padding: '0.5rem 1rem',
                backgroundColor: error ? '#fff3cd' : '#e3f2fd',
                color: error ? '#856404' : '#0d47a1',
                borderRadius: '4px',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    {error ? (
                        <span>
                            <strong>Problem:</strong> {error} (Försök {retryCount})
                        </span>
                    ) : (
                        <span>
                            <strong>Status:</strong> {isUpdating ? 'Uppdaterar...' : 'Ansluten'}
                        </span>
                    )}
                </div>
                <div>
                    <span>Senast uppdaterad: {lastUpdate ? formatDate(lastUpdate) : 'Aldrig'}</span>
                    <button 
                        onClick={handleManualRefresh} 
                        disabled={isUpdating}
                        style={{
                            marginLeft: '10px',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: isUpdating ? '#ccc' : '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isUpdating ? 'Uppdaterar...' : '↻ Uppdatera'}
                    </button>
                </div>
            </div>
            
            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setTasks, tasks)}
            >
                <h2 className="ticket-tasks-header">Ärenden {tasks.length > 0 && `(${tasks.length})`}</h2>
                {tasks.length === 0 ? (
                    <div className="empty-state">
                        {isUpdating ? 'Uppdaterar ärenden...' : 'Inga nya ärenden tillgängliga'}
                    </div>
                ) : (
                    tasks.map((task) => (
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
                                {task.content || task.issueType}
                            </div>
                            
                            <div className="ticket-task-details">
                                <div className="ticket-wtp">{task.wtp || 'Okategoriserad'}</div>
                                <div className="ticket-task-email">{task.email || ''}</div>
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
                    ))
                )}
            </div>

            <div
                className="ticket-my-tasks"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setMyTasks, myTasks)}
            >
                <h2 className="ticket-my-tasks-header">Mina ärenden {myTasks.length > 0 && `(${myTasks.length})`}</h2>
                {myTasks.length === 0 ? (
                    <div className="empty-state">
                        Dra ärenden hit för att börja arbeta med dem
                    </div>
                ) : (
                    myTasks.map((task) => (
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
                                {task.content || task.issueType}
                            </div>
                            
                            <div className="ticket-task-details">
                                <div className="ticket-wtp">{task.wtp || 'Okategoriserad'}</div>
                                <div className="ticket-task-email">{task.email || ''}</div>
                                <div className="ticket-task-time">
                                    {task.movedAt ? `Tagen: ${formatDate(task.movedAt)}` : formatDate(task.timestamp)}
                                </div>
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
                    ))
                )}
            </div>

            <div
                className="ticket-done"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(setDone, done)}
            >
                <h2 className="ticket-done-header">Klara {done.length > 0 && `(${done.length})`}</h2>
                {done.length === 0 ? (
                    <div className="empty-state">
                        Dra ärenden hit när de är klara
                    </div>
                ) : (
                    done.map((task) => (
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
                                {task.content || task.issueType}
                            </div>
                            
                            <div className="ticket-task-details">
                                <div className="ticket-wtp">{task.wtp || 'Okategoriserad'}</div>
                                <div className="ticket-task-time">
                                    {task.movedAt ? `Slutförd: ${formatDate(task.movedAt)}` : formatDate(task.timestamp)}
                                </div>
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
                    ))
                )}
            </div>
        </div>
    );
}

export default Main;