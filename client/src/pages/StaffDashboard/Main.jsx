// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
import { useState, useEffect } from "react";
import Aside from "./Aside";
import ChatLink from "../../ChatLink"; // Import the ChatLink component
import { useAuth } from "../../AuthContext"; // Import useAuth hook

// Definierar huvudkomponenten för applikationen
function Main() {
    // Get current user from auth context
    const { user } = useAuth();
    
    // Create user-specific storage keys
    const getUserTasksKey = () => `tasks_${user?.username || 'guest'}`;
    const getMyTasksKey = () => `myTasks_${user?.username || 'guest'}`;
    const getDoneTasksKey = () => `done_${user?.username || 'guest'}`;
    
    // State för alla ärenden/tasks
    const [tasks, setTasks] = useState(() => {
        // Try to get tasks from localStorage on initial render with user-specific key
        const savedTasks = localStorage.getItem(getUserTasksKey());
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    
    // State för användarens egna ärenden
    const [myTasks, setMyTasks] = useState(() => {
        // Try to get myTasks from localStorage on initial render with user-specific key
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        return savedMyTasks ? JSON.parse(savedMyTasks) : [];
    });
    
    // State för färdiga ärenden
    const [done, setDone] = useState(() => {
        // Try to get done tasks from localStorage on initial render with user-specific key
        const savedDone = localStorage.getItem(getDoneTasksKey());
        return savedDone ? JSON.parse(savedDone) : [];
    });
    
    // State för att hålla koll på vilket ärende som dras
    const [draggedTask, setDraggedTask] = useState(null);
    
    // State för att hålla koll på visade ärenden
    const [viewedTickets, setViewedTickets] = useState(() => {
        const savedViewedTickets = localStorage.getItem('viewedTickets');
        return savedViewedTickets ? JSON.parse(savedViewedTickets) : {};
    });

    // Define mapping objects for tasks and their setter functions
    const listMap = {
        tasks: tasks,
        myTasks: myTasks,
        done: done
    };
    
    const listSetterMap = {
        tasks: setTasks,
        myTasks: setMyTasks,
        done: setDone
    };

    const [issuTypeFilter, setIssueTypeFilter] = useState('');

    const handleIssueFilterChange = (e) => {
        setIssueTypeFilter(e.target.value);
    };

    const getUniqueIssueTypes = () => {
        const predefinedTypes = [
            // Fordonsservice ärendetyper
            "Problem efter reparation",
            "Garantiärende",
            "Reklamation",
            "Kostnadsförfrågan",
            "Reservdelsfrågor",

            // Telecom/Bredband ärendetyper
            "Tekniskt problem",
            "Fakturafrågor",
            "Ändring av tjänst",
            "Uppsägning",

            // Försäkringsärenden ärendetyper
            "Pågående skadeärende",
            "Frågor om försäkringsskydd",
            "Ändring av försäkring",
            "Begäran om försäkringshandlingar"
        ];

        const allTasks = [...tasks, ...myTasks, ...done];

        const uniqueTypes = new Set(predefinedTypes);

        allTasks.forEach(task => {
            if(task.wtp){
                uniqueTypes.add(task.wtp);
            }
        });

        return Array.from(uniqueTypes);
    };

    const filteredTasks = issuTypeFilter
        ? tasks.filter(task => task.wtp === issuTypeFilter)
        : tasks;

    // Reload tasks from localStorage when user changes
    useEffect(() => {
        const savedTasks = localStorage.getItem(getUserTasksKey());
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        const savedDone = localStorage.getItem(getDoneTasksKey());
        
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);
        setMyTasks(savedMyTasks ? JSON.parse(savedMyTasks) : []);
        setDone(savedDone ? JSON.parse(savedDone) : []);
        
        // Also fetch new tickets when user changes
        fetchAllTickets();
    }, [user?.username]); // Re-run when username changes

    // Save tasks state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(getUserTasksKey(), JSON.stringify(tasks));
    }, [tasks, user]);

    // Save myTasks state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(getMyTasksKey(), JSON.stringify(myTasks));
    }, [myTasks, user]);

    // Save done state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(getDoneTasksKey(), JSON.stringify(done));
    }, [done, user]);
    
    // Save viewedTickets state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('viewedTickets', JSON.stringify(viewedTickets));
    }, [viewedTickets]);

    useEffect(() => {
        fetchAllTickets();
    }, []);

    // Funktion för att markera ett ärende som visat
    function markAsViewed(taskId) {
        setViewedTickets(prev => ({
            ...prev,
            [taskId]: true
        }));
    }

    // Funktion för att kontrollera om ett ärende är nytt/ovisat
    function isNewTicket(taskId) {
        return !viewedTickets[taskId];
    }

    function printFetchError(error) {
        console.error("failed to fetch tickets: " + error);
    }

    function fetchAllTickets() {
        console.log("fetching tickets");
        try {
            fetch("/api/tickets", { credentials: "include" }) // credentials: "include" : viktigt för att hålla koll på session-state
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
    function handleDragStart(task, column, e) {
        if (column === 'done') {
            if (e && e.preventDefault) e.preventDefault();
            return false;
        }
        setDraggedTask({ task, column });
    }

    // Förhindrar standardbeteende vid drag-over
    function handleDragOver(e) { e.preventDefault(); }

    // Funktion som körs när man släpper ett ärende i en ny kolumn
    const handleDrop = async (e, setList, destColumn) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!draggedTask) return;

        const sourceColumn = draggedTask.column;
        const task = draggedTask.task;

        console.log(`Moving task ${task.id} from ${sourceColumn} to ${destColumn}`);

        // Check if the task is being moved to the done column from another column
        if (destColumn === 'done' && sourceColumn !== 'done') {
            try {
                // Archive the ticket in the database
                await archiveTicket(task);
                console.log("Ticket archived successfully");
            } catch (error) {
                console.error("Failed to archive ticket:", error);
                // You might want to show an error message to the user here
            }
        }

        // Remove the task from the source list
        if (sourceColumn && listSetterMap[sourceColumn]) {
            listSetterMap[sourceColumn](prev => 
                prev.filter(t => t.id !== task.id && t.chatToken !== task.chatToken)
            );
        }

        // Add the task to the destination list
        setList(prev => [...prev, {...task, column: destColumn}]);
        
        // Clear the dragged task
        setDraggedTask(null);
    };

    // Improve the archiveTicket function with better error handling
    const archiveTicket = async (ticket) => {
        try {
            console.log("Archiving ticket:", ticket);
            
            // Get the actual source table for the form
            const actualSourceTable = determineOriginalTable(ticket);
            console.log("Determined source table:", actualSourceTable);
            
            // Let the server know whether this table has is_chat_active
            const hasIsChatActive = actualSourceTable !== "initial_form_messages";
            
            // Convert some fields if needed for the ArchivedTickets model
            const archivedTicket = {
                // Required fields for your database schema
                originalId: 1,
                originalTable: "initial_form_messages",
                form_type: determineFormType(ticket) || "Unknown",
                
                // Tell the server which table to update
                determineTable: actualSourceTable,
                hasIsChatActive: hasIsChatActive,
                
                // Other fields
                firstName: ticket.firstName || ticket.sender?.split(' ')[0] || "Unknown",
                email: ticket.email || "No email provided",
                serviceType: ticket.serviceType || ticket.category || "",
                issueType: ticket.issueType || ticket.wtp || "",
                message: ticket.message || "",
                chatToken: ticket.chatToken || "",
                timestamp: ticket.timestamp || ticket.submittedAt || new Date().toISOString(),
                formType: determineFormType(ticket) || "Unknown",
                companyType: ticket.companyType || "",
                resolutionNotes: "Closed from dashboard"
            };

            console.log("Sending archive data with table update info:", JSON.stringify(archivedTicket));

            // Single API call that both archives the ticket AND updates is_chat_active
            const response = await fetch('/api/tickets/archive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(archivedTicket)
            });

            const responseData = await response.text();
            console.log("Archive response:", response.status, responseData);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseData}`);
            }

            return responseData ? JSON.parse(responseData) : { success: true };
        } catch (error) {
            console.error('Error archiving ticket:', error);
            alert("Failed to archive ticket: " + error.message);
            throw error;
        }
    };

    // Helper function to determine original table based on ticket properties
    const determineOriginalTable = (ticket) => {
        if (ticket.regNummer) return "fordon_forms";
        if (ticket.insuranceType) return "forsakrings_forms";
        if (ticket.serviceType) return "tele_forms";
        return "initial_form_messages";
    };

    // Helper function to determine form type
    const determineFormType = (ticket) => {
        if (ticket.regNummer) return "Fordonsservice";
        if (ticket.insuranceType) return "Försäkringsärende";
        if (ticket.serviceType) return "Tele/Bredband";
        return ticket.formType || "Unknown";
    };

    // Funktion för att hantera redigering av ärenden
    function handleTaskEdit(taskId, newContent, setColumn) {
        setColumn(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, content: newContent }
                : task
        ));
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

    // Huvudvy för applikationen
    return (
        // Huvudcontainer
        <div className="main-container">
            <Aside />

            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setTasks, 'tasks')}
            >
                <h2 className="ticket-tasks-header">Ärenden</h2>
            <div className="ticket-items-container">
                <div className="issue-filter-container">
                    <select value={issuTypeFilter}
                    onChange={handleIssueFilterChange}
                    className="issue-type-filter"
                    >
                        <option value="">Alla Ärendetyper</option>
                        {getUniqueIssueTypes().map ((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {filteredTasks.map((task) => (
                    // Container för varje ärende
                    <div
                        key={task.id || task.chatToken}
                        draggable
                        onDragStart={(e) => handleDragStart(task, 'tasks', e)}
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
                                {/* Replace regular link with ChatLink component */}
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
            <div
                className="ticket-my-tasks"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setMyTasks, 'myTasks')}
            >
                <h2 className="ticket-my-tasks-header">Mina ärenden</h2>
                <div className="ticket-items-container">
                    {myTasks.map((task) => (
                        <div
                            key={task.id || task.chatToken}
                            draggable
                            onDragStart={(e) => handleDragStart(task, 'myTasks', e)}
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
                                    {/* Replace regular link with ChatLink component */}
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

            <div
                className="ticket-done"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setDone, 'done')}
            >
                <h2 className="ticket-done-header">Klara</h2>
                <div className="ticket-items-container">
                    {done.map((task) => (
                        <div
                            key={task.id || task.chatToken}
                            draggable={false}
                            className="ticket-task-item completed-task"
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
                                    {/* Replace regular link with ChatLink component */}
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
    );
}

// Exporterar Main-komponenten som default export
export default Main;