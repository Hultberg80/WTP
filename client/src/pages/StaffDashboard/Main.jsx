// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
import { useState, useEffect } from "react";
import Aside from "./Aside";
import ChatLink from "../../ChatLink"; // Importerar ChatLink-komponenten
import { useAuth } from "../../AuthContext"; // Importerar useAuth-hooken

// Definierar huvudkomponenten för applikationen
function Main() {
    // Hämtar aktuell användare från auth context
    const { user } = useAuth();
    
    // Skapar användarspecifika nycklar för localStorage
    const getUserTasksKey = () => `tasks_${user?.username || 'guest'}`;
    const getMyTasksKey = () => `myTasks_${user?.username || 'guest'}`;
    const getDoneTasksKey = () => `done_${user?.username || 'guest'}`;
    
    // Skapar företagsövergripande nyckel för att spåra vilka ärenden som bearbetas
    const getCompanyActiveTasksKey = () => `companyActiveTasks_${user?.company || 'guest'}`;
    
    // State för alla ärenden/tasks
    const [tasks, setTasks] = useState(() => {
        // Försöker hämta ärenden från localStorage vid första renderingen med användarspecifik nyckel
        const savedTasks = localStorage.getItem(getUserTasksKey());
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    
    // State för användarens egna ärenden
    const [myTasks, setMyTasks] = useState(() => {
        // Försöker hämta användarens egna ärenden från localStorage med användarspecifik nyckel
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        return savedMyTasks ? JSON.parse(savedMyTasks) : [];
    });
    
    // State för färdiga ärenden
    const [done, setDone] = useState(() => {
        // Försöker hämta färdiga ärenden från localStorage med användarspecifik nyckel
        const savedDone = localStorage.getItem(getDoneTasksKey());
        return savedDone ? JSON.parse(savedDone) : [];
    });
    
    // Spårar aktiva ärenden över hela företaget (enbart frontend-lösning)
    const [companyActiveTasks, setCompanyActiveTasks] = useState(() => {
        const savedCompanyTasks = localStorage.getItem(getCompanyActiveTasksKey());
        return savedCompanyTasks ? JSON.parse(savedCompanyTasks) : [];
    });
    
    // State för att hålla koll på vilket ärende som dras
    const [draggedTask, setDraggedTask] = useState(null);

    // Definierar mappningsobjekt för ärenden och deras setter-funktioner
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

    // Sätter upp periodisk kontroll av localStorage för företagsaktiva ärenden
    useEffect(() => {
        // Uppdaterar mina ärenden i företagsregistret
        updateCompanyActiveTasks();
        
        // Sätter upp intervall för att regelbundet kontrollera företagsövergripande aktiva ärenden
        const intervalId = setInterval(() => {
            checkCompanyActiveTasks();
        }, 5000); // Kontrollerar var 5:e sekund
        
        return () => {
            clearInterval(intervalId);
        };
    }, [user?.username, user?.company]);

    // Ladda om ärenden från localStorage när användaren ändras
    useEffect(() => {
        const savedTasks = localStorage.getItem(getUserTasksKey());
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        const savedDone = localStorage.getItem(getDoneTasksKey());
        
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);
        setMyTasks(savedMyTasks ? JSON.parse(savedMyTasks) : []);
        setDone(savedDone ? JSON.parse(savedDone) : []);
        
        // Hämtar också nya ärenden när användaren ändras
        fetchAllTickets();
    }, [user?.username]); // Körs om när användarnamnet ändras

    // Sparar tasks-state till localStorage när det ändras
    useEffect(() => {
        localStorage.setItem(getUserTasksKey(), JSON.stringify(tasks));
    }, [tasks, user]);

    // Sparar myTasks-state till localStorage när det ändras
    useEffect(() => {
        localStorage.setItem(getMyTasksKey(), JSON.stringify(myTasks));
        
        // När myTasks ändras, uppdatera företagets aktiva ärenden
        updateCompanyActiveTasks();
    }, [myTasks, user]);

    // Sparar done-state till localStorage när det ändras
    useEffect(() => {
        localStorage.setItem(getDoneTasksKey(), JSON.stringify(done));
    }, [done, user]);

    // Hämtar ärenden på nytt efter att vi uppdaterat företagets aktiva ärenden
    useEffect(() => {
        fetchAllTickets();
    }, [companyActiveTasks]);

    // Initial hämtning av alla ärenden
    useEffect(() => {
        fetchAllTickets();
    }, []);

    // Uppdaterar vilka ärenden denna användare arbetar med i företagsregistret
    function updateCompanyActiveTasks() {
        if (!user?.username || !user?.company) return;
        
        // Hämtar företagets nuvarande aktiva ärenden
        let currentActiveTasksStr = localStorage.getItem(getCompanyActiveTasksKey());
        let currentActiveTasks = currentActiveTasksStr ? JSON.parse(currentActiveTasksStr) : [];
        
        // Tar bort alla ärenden som tidigare tilldelats denna användare
        currentActiveTasks = currentActiveTasks.filter(task => 
            task.assignedToUsername !== user.username
        );
        
        // Lägger till alla ärenden som finns i myTasks som tilldelade till denna användare
        const myActiveTasksInfo = myTasks.map(task => ({
            ticketId: task.id || task.chatToken,
            chatToken: task.chatToken,
            assignedToUsername: user.username,
            assignedAt: new Date().toISOString()
        }));
        
        // Kombinerar den filtrerade listan och nya tilldelningar
        const updatedActiveTasks = [...currentActiveTasks, ...myActiveTasksInfo];
        
        // Sparar tillbaka till localStorage
        localStorage.setItem(getCompanyActiveTasksKey(), JSON.stringify(updatedActiveTasks));
        
        // Uppdaterar state
        setCompanyActiveTasks(updatedActiveTasks);
    }

    // Kontrollerar företagsövergripande aktiva ärenden
    function checkCompanyActiveTasks() {
        if (!user?.company) return;
        
        const companyTasksStr = localStorage.getItem(getCompanyActiveTasksKey());
        if (!companyTasksStr) return;
        
        const companyTasks = JSON.parse(companyTasksStr);
        
        // Uppdaterar state med de senaste företagsövergripande aktiva ärendena
        setCompanyActiveTasks(companyTasks);
    }

    function printFetchError(error) {
        console.error("failed to fetch tickets: " + error);
    }

    function fetchAllTickets() {
        console.log("fetching tickets");
        try {
            fetch("/api/tickets", { credentials: "include" })
                .then(response => response.json(), printFetchError)
                .then(data => {
                    // Transformerar datan
                    let newData = data.map(ticket => ({
                        ...ticket,
                        id: ticket.id || ticket.chatToken, // Säkerställer att varje objekt har ett id
                        issueType: `${ticket.sender} - ${ticket.formType}`,
                        wtp: ticket.issueType,
                        chatToken: ticket.chatToken,
                        chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
                    }));

                    // Skapar en uppsättning av ID:n som finns i myTasks eller done
                    const myTasksIds = new Set(myTasks.map(task => task.id || task.chatToken));
                    const doneIds = new Set(done.map(task => task.id || task.chatToken));
                    
                    // Skapar en uppsättning av ID:n som bearbetas av andra användare i företaget
                    const otherUsersTaskIds = new Set(
                        companyActiveTasks
                            .filter(activeTask => activeTask.assignedToUsername !== user?.username)
                            .map(activeTask => activeTask.ticketId || activeTask.chatToken)
                    );
                    
                    // Filtrerar ut ärenden som redan finns i myTasks, done eller bearbetas av andra
                    const filteredTasks = newData.filter(task => {
                        const taskId = task.id || task.chatToken;
                        return !myTasksIds.has(taskId) && 
                               !doneIds.has(taskId) &&
                               !otherUsersTaskIds.has(taskId);
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

        try {
            // Kontrollerar om ärendet flyttas till klara-kolumnen från en annan kolumn
            if (destColumn === 'done' && sourceColumn !== 'done') {
                // Arkiverar ärendet i databasen
                await archiveTicket(task);
                console.log("Ärendet arkiverades framgångsrikt");
            }

            // Tar bort ärendet från källlistan
            if (sourceColumn && listSetterMap[sourceColumn]) {
                listSetterMap[sourceColumn](prev => 
                    prev.filter(t => t.id !== task.id && t.chatToken !== task.chatToken)
                );
            }

            // Lägger till ärendet i mållistan
            setList(prev => [...prev, {...task, column: destColumn}]);
            
            // Uppdaterar företagets aktiva ärenden om vi flyttar till/från myTasks
            if (destColumn === 'myTasks' || sourceColumn === 'myTasks') {
                setTimeout(updateCompanyActiveTasks, 100);
            }
        } catch (error) {
            console.error("Error during drop operation:", error);
            alert("Ett fel uppstod: " + error.message);
        } finally {
            // Clear the dragged task
            setDraggedTask(null);
        }
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
                resolutionNotes: "Closed from dashboard",
                closedBy: user?.username || "Unknown user"
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

            // Also remove from company active tasks
            removeFromCompanyActiveTasks(ticket);

            return responseData ? JSON.parse(responseData) : { success: true };
        } catch (error) {
            console.error('Error archiving ticket:', error);
            alert("Failed to archive ticket: " + error.message);
            throw error;
        }
    };

    // Tar bort ett ärende från företagets aktiva ärenden
    function removeFromCompanyActiveTasks(ticket) {
        if (!user?.company) return;
        
        const ticketId = ticket.id || ticket.chatToken;
        
        // Hämtar företagets nuvarande aktiva ärenden
        let activeTasks = localStorage.getItem(getCompanyActiveTasksKey());
        if (!activeTasks) return;
        
        let activeTasksArray = JSON.parse(activeTasks);
        
        // Tar bort ärendet
        activeTasksArray = activeTasksArray.filter(task => 
            task.ticketId !== ticketId && task.chatToken !== ticket.chatToken
        );
        
        // Sparar tillbaka till localStorage
        localStorage.setItem(getCompanyActiveTasksKey(), JSON.stringify(activeTasksArray));
        
        // Uppdaterar state
        setCompanyActiveTasks(activeTasksArray);
    }

    // Hjälpfunktion för att bestämma originaltabell baserat på ärendets egenskaper
    const determineOriginalTable = (ticket) => {
        if (ticket.regNummer) return "fordon_forms";
        if (ticket.insuranceType) return "forsakrings_forms";
        if (ticket.serviceType) return "tele_forms";
        return "initial_form_messages";
    };

    // Hjälpfunktion för att bestämma formulärtyp
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
                        className="ticket-task-item"
                    >
                        <div className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
                        >
                            {task.issueType}
                        </div>

                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                            <div className="ticket-task-email">{task.email}</div>
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

            <div
                className="ticket-my-tasks"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setMyTasks, 'myTasks')}
            >
                <h2 className="ticket-my-tasks-header">Mina ärenden</h2>
                {myTasks.map((task) => (
                    <div
                        key={task.id || task.chatToken}
                        draggable
                        onDragStart={(e) => handleDragStart(task, 'myTasks', e)}
                        className="ticket-task-item"
                    >
                        <div className="ticket-task-content"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setMyTasks)}
                        >
                            {task.issueType}
                        </div>

                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.wtp}</div>
                            <div className="ticket-task-email">{task.email}</div>
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

            <div
                className="ticket-done"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setDone, 'done')}
            >
                <h2 className="ticket-done-header">Klara</h2>
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
    );
}

// Exporterar Main-komponenten som default export
export default Main;