// Importerar nödvändiga React hooks för state-hantering, sidoeffekter, callbacks och referenser
import { useState, useEffect } from "react";
import Aside from "./Aside";
import ChatLink from "../../ChatLink"; // Importerar ChatLink-komponenten för chattfunktionalitet
import { useAuth } from "../../AuthContext"; // Importerar useAuth hook för autentiseringshantering

/**
 * Huvudkomponent för ärendehanteringsgränssnittet
 * Implementerar ett Kanban-liknande system med tre kolumner: Ärenden, Mina Ärenden och Klara
 * Stödjer drag-and-drop-funktionalitet mellan kolumner samt arkivering av klara ärenden
 */
function Main() {
    // Hämtar information om inloggad användare från autentiseringskontext
    const { user } = useAuth();
    
    // Skapar användarspecifika nycklar för lagring i localStorage
    // Detta säkerställer att varje användare har sina egna listor med ärenden
    const getUserTasksKey = () => `tasks_${user?.username || 'guest'}`;
    const getMyTasksKey = () => `myTasks_${user?.username || 'guest'}`;
    const getDoneTasksKey = () => `done_${user?.username || 'guest'}`;
    
    // STATE-HANTERING FÖR ÄRENDEKATEGORIER
    
    // State för alla nya ärenden som inte har tilldelats än
    const [tasks, setTasks] = useState(() => {
        // Lazy initialization - läser från localStorage om det finns, annars tom array
        const savedTasks = localStorage.getItem(getUserTasksKey());
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    
    // State för ärenden som den aktuella användaren arbetar med
    const [myTasks, setMyTasks] = useState(() => {
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        return savedMyTasks ? JSON.parse(savedMyTasks) : [];
    });
    
    // State för färdiga/arkiverade ärenden
    const [done, setDone] = useState(() => {
        const savedDone = localStorage.getItem(getDoneTasksKey());
        return savedDone ? JSON.parse(savedDone) : [];
    });
    
    // State för att hålla reda på vilket ärende som dras för närvarande
    // Lagrar både ärendet och källkolumnen
    const [draggedTask, setDraggedTask] = useState(null);
    
    // State för att hålla reda på vilka ärenden användaren har sett
    // Används för att markera nya/osedda ärenden
    const [viewedTickets, setViewedTickets] = useState(() => {
        const savedViewedTickets = localStorage.getItem('viewedTickets');
        return savedViewedTickets ? JSON.parse(savedViewedTickets) : {};
    });

    // Mappningsobjekt för enklare åtkomst till listan och dess uppdateringsfunktion
    // Används för att dynamiskt referera till rätt lista baserat på kolumnnamn
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

    // State för filtrering av ärenden baserat på ärendetyp
    const [issuTypeFilter, setIssueTypeFilter] = useState('');

    // Funktion för att hantera ändringar i filtermenyn
    const handleIssueFilterChange = (e) => {
        setIssueTypeFilter(e.target.value);
    };

    /**
     * Funktion som samlar in alla unika ärendetyper för filtermenyn
     * Kombinerar fördefinierade typer med typer som finns i befintliga ärenden
     * @returns {Array} - En array med unika ärendetyper
     */
    const getUniqueIssueTypes = () => {
        // Fördefinierade ärendetyper som alltid ska finnas tillgängliga i filtret
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

        // Samlar alla ärenden från alla tre kolumner
        const allTasks = [...tasks, ...myTasks, ...done];

        // Skapar en Set för att samla unika värden
        const uniqueTypes = new Set(predefinedTypes);

        // Lägger till alla unika ärendetyper från befintliga ärenden
        allTasks.forEach(task => {
            if(task.wtp){
                uniqueTypes.add(task.wtp);
            }
        });

        // Konverterar Set till Array för att kunna användas i select-element
        return Array.from(uniqueTypes);
    };

    // Filtrerar ärendena baserat på vald filtertyp
    // Om inget filter är valt visas alla ärenden
    const filteredTasks = issuTypeFilter
        ? tasks.filter(task => task.wtp === issuTypeFilter)
        : tasks;

    // EFFEKTER (USEEFFECT) FÖR SYNKRONISERING OCH DATAHANTERING

    // Laddar ärenden från localStorage när användaren ändras
    // Detta säkerställer att rätt användardata visas efter inloggning/utloggning
    useEffect(() => {
        const savedTasks = localStorage.getItem(getUserTasksKey());
        const savedMyTasks = localStorage.getItem(getMyTasksKey());
        const savedDone = localStorage.getItem(getDoneTasksKey());
        
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);
        setMyTasks(savedMyTasks ? JSON.parse(savedMyTasks) : []);
        setDone(savedDone ? JSON.parse(savedDone) : []);
        
        // Hämtar även nya ärenden från servern när användaren ändras
        fetchAllTickets();
    }, [user?.username]); // Körs när användarens namn ändras

    // Sparar tasks-state till localStorage när den ändras
    useEffect(() => {
        localStorage.setItem(getUserTasksKey(), JSON.stringify(tasks));
    }, [tasks, user]);

    // Sparar myTasks-state till localStorage när den ändras
    useEffect(() => {
        localStorage.setItem(getMyTasksKey(), JSON.stringify(myTasks));
    }, [myTasks, user]);

    // Sparar done-state till localStorage när den ändras
    useEffect(() => {
        localStorage.setItem(getDoneTasksKey(), JSON.stringify(done));
    }, [done, user]);
    
    // Sparar information om vilka ärenden som har visats
    useEffect(() => {
        localStorage.setItem('viewedTickets', JSON.stringify(viewedTickets));
    }, [viewedTickets]);

    // Hämtar nya ärenden från servern när komponenten laddas första gången
    useEffect(() => {
        fetchAllTickets();
    }, []);

    // HJÄLPFUNKTIONER FÖR ÄRENDEHANTERING

    /**
     * Markerar ett ärende som visat/sett av användaren
     * Används när användaren öppnar en chatt eller interagerar med ärendet
     * @param {string|number} taskId - ID för ärendet som ska markeras som sett
     */
    function markAsViewed(taskId) {
        setViewedTickets(prev => ({
            ...prev,
            [taskId]: true // Sätter en flagga för att markera ärendet som sett
        }));
    }

    /**
     * Kontrollerar om ett ärende är nytt/ovisat för användaren
     * @param {string|number} taskId - ID för ärendet som ska kontrolleras
     * @returns {boolean} - True om ärendet är nytt/ovisat, annars false
     */
    function isNewTicket(taskId) {
        return !viewedTickets[taskId];
    }

    /**
     * Hjälpfunktion för att hantera fetch-fel
     * @param {Error} error - Felmeddelande som ska loggas
     */
    function printFetchError(error) {
        console.error("failed to fetch tickets: " + error);
    }

    /**
     * Hämtar alla aktiva ärenden från servern
     * Transformerar data för att passa komponenten
     * Filtrerar bort ärenden som redan finns i myTasks eller done
     */
    function fetchAllTickets() {
        console.log("fetching tickets");
        try {
            // Hämtar data från API med sessions-credentials
            fetch("/api/tickets", { credentials: "include" }) // credentials: "include" är viktigt för att behålla session
                .then(response => response.json(), printFetchError)
                .then(data => {
                    // Transformerar datan för att passa komponentens datamodell
                    let newData = data.map(ticket => ({
                        ...ticket,
                        id: ticket.id || ticket.chatToken, // Säkerställer att varje ärende har ett unikt ID
                        issueType: `${ticket.sender} - ${ticket.formType}`, // Skapar en beskrivande rubrik
                        wtp: ticket.issueType, // WTP = What's The Problem (ärendetyp)
                        chatToken: ticket.chatToken,
                        chatLink: `http://localhost:3001/chat/${ticket.chatToken}` // Länk till chattsidan
                    }));

                    // Skapar uppsättningar av ID:n som redan finns i myTasks eller done
                    // Används för att undvika duplikat
                    const myTasksIds = new Set(myTasks.map(task => task.id || task.chatToken));
                    const doneIds = new Set(done.map(task => task.id || task.chatToken));
                    
                    // Filtrerar bort ärenden som redan finns i myTasks eller done
                    // Detta förhindrar att samma ärende visas på flera ställen
                    const filteredTasks = newData.filter(task => {
                        const taskId = task.id || task.chatToken;
                        return !myTasksIds.has(taskId) && !doneIds.has(taskId);
                    });
                    
                    // Uppdaterar state med de filtrerade ärendena
                    setTasks(filteredTasks);

                }, printFetchError);
        } catch (error) {
            console.error("failed to fetch tickets:", error);
        }
    }

    // FUNKTIONER FÖR DRAG-AND-DROP

    /**
     * Funktion som körs när användaren börjar dra ett ärende
     * Spårar vilket ärende som dras och från vilken kolumn
     * Förhindrar också att ärenden dras från done-kolumnen
     * @param {Object} task - Ärendeobjektet som dras
     * @param {string} column - Källkolumnen (tasks, myTasks, done)
     * @param {Event} e - Drag-eventet
     * @returns {boolean} - False om dragging förhindras
     */
    function handleDragStart(task, column, e) {
        // Förhindrar drag från "Klara"-kolumnen
        if (column === 'done') {
            if (e && e.preventDefault) e.preventDefault();
            return false;
        }
        // Sparar information om vilket ärende och från vilken kolumn
        setDraggedTask({ task, column });
    }

    /**
     * Förhindrar standardbeteende vid drag-over (behövs för drag-and-drop)
     * @param {Event} e - DragOver-eventet
     */
    function handleDragOver(e) { e.preventDefault(); }

    /**
     * Hanterar när ett ärende släpps i en ny kolumn
     * Flyttar ärendet mellan kolumner och arkiverar om det flyttas till "Klara"
     * @param {Event} e - Drop-eventet
     * @param {Function} setList - Uppdateringsfunktionen för målkolumnen
     * @param {string} destColumn - Målkolumnen (tasks, myTasks, done)
     */
    const handleDrop = async (e, setList, destColumn) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!draggedTask) return;

        const sourceColumn = draggedTask.column;
        const task = draggedTask.task;

        console.log(`Moving task ${task.id} from ${sourceColumn} to ${destColumn}`);

        // Särskild hantering för ärenden som flyttas till "Klara"
        if (destColumn === 'done' && sourceColumn !== 'done') {
            try {
                // Arkiverar ärendet i databasen
                await archiveTicket(task);
                console.log("Ticket archived successfully");
            } catch (error) {
                console.error("Failed to archive ticket:", error);
                // Här kan man visa ett felmeddelande för användaren
            }
        }

        // Tar bort ärendet från källkolumnen
        if (sourceColumn && listSetterMap[sourceColumn]) {
            listSetterMap[sourceColumn](prev => 
                prev.filter(t => t.id !== task.id && t.chatToken !== task.chatToken)
            );
        }

        // Lägger till ärendet i målkolumnen
        setList(prev => [...prev, {...task, column: destColumn}]);
        
        // Rensar det dragna ärendet
        setDraggedTask(null);
    };

    /**
     * Funktion för att arkivera ett ärende i databasen
     * Används när ett ärende flyttas till "Klara"-kolumnen
     * Uppdaterar även is_chat_active-flaggan i relevanta tabeller
     * @param {Object} ticket - Ärendet som ska arkiveras
     * @returns {Promise<Object>} - Svar från servern
     */
    const archiveTicket = async (ticket) => {
        try {
            console.log("Archiving ticket:", ticket);
            
            // Avgör vilken databastabell ärendet ursprungligen kommer från
            const actualSourceTable = determineOriginalTable(ticket);
            console.log("Determined source table:", actualSourceTable);
            
            // Kontrollerar om tabellen har en is_chat_active-kolumn
            const hasIsChatActive = actualSourceTable !== "initial_form_messages";
            
            // Förbereder data för arkiveringsanropet
            const archivedTicket = {
                // Obligatoriska fält för databasens schema
                originalId: 1,
                originalTable: "initial_form_messages",
                form_type: determineFormType(ticket) || "Unknown",
                
                // Information för att uppdatera rätt tabell
                determineTable: actualSourceTable,
                hasIsChatActive: hasIsChatActive,
                
                // Övriga ärendefält
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

            // API-anrop som både arkiverar ärendet OCH uppdaterar is_chat_active
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

    /**
     * Avgör vilken databastabell ett ärende kommer från
     * Baseras på vilka speciella fält ärendet innehåller
     * @param {Object} ticket - Ärendet som ska analyseras
     * @returns {string} - Namnet på databastabellen
     */
    const determineOriginalTable = (ticket) => {
        if (ticket.regNummer) return "fordon_forms";
        if (ticket.insuranceType) return "forsakrings_forms";
        if (ticket.serviceType) return "tele_forms";
        return "initial_form_messages";
    };

    /**
     * Avgör ärendetyp baserat på ärendets egenskaper
     * @param {Object} ticket - Ärendet som ska analyseras
     * @returns {string} - Ärendetypen i läsbart format
     */
    const determineFormType = (ticket) => {
        if (ticket.regNummer) return "Fordonsservice";
        if (ticket.insuranceType) return "Försäkringsärende";
        if (ticket.serviceType) return "Tele/Bredband";
        return ticket.formType || "Unknown";
    };

    /**
     * Funktion för att hantera redigering av ärenden
     * Används när användaren redigerar innehållet i ett ärende
     * @param {string|number} taskId - ID för ärendet som redigeras
     * @param {string} newContent - Nytt innehåll
     * @param {Function} setColumn - Uppdateringsfunktion för kolumnen
     */
    function handleTaskEdit(taskId, newContent, setColumn) {
        setColumn(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, content: newContent }
                : task
        ));
    }

    /**
     * Formaterar datum enligt svenskt format
     * @param {string} dateString - Datumsträngen som ska formateras
     * @returns {string} - Formaterad datumsträng
     */
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

    // KOMPONENTENS RENDERING - ANVÄNDARGRÄNSSNITT
    return (
        // Huvudcontainer för hela komponenten
        <div className="main-container">
            <Aside />

            {/* KOLUMN 1: ÄRENDEN - Nya ärenden som ingen arbetar med än */}
            <div
                className="ticket-tasks"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setTasks, 'tasks')}
            >
                <h2 className="ticket-tasks-header">Ärenden</h2>
                <div className="ticket-items-container">
                    {/* Filter för att visa ärenden av en viss typ */}
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

                    {/* Listar alla ärenden i första kolumnen */}
                    {filteredTasks.map((task) => (
                        // Container för varje enskilt ärende
                        <div
                            key={task.id || task.chatToken}
                            draggable
                            onDragStart={(e) => handleDragStart(task, 'tasks', e)}
                            className={`ticket-task-item ${isNewTicket(task.id) ? 'new-ticket' : ''}`}
                        >
                            {/* Redigerbar innehållsruta */}
                            <div className="ticket-task-content"
                                contentEditable
                                suppressContentEditableWarning={true}
                                onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
                            >
                                {task.issueType}
                            </div>
                            
                            {/* Badge för att markera nya/osedda ärenden */}
                            {isNewTicket(task.id) && (
                                <div className="new-ticket-badge">Ny</div>
                            )}

                            {/* Detaljsektion för ärendet */}
                            <div className="ticket-task-details">
                                <div className="ticket-wtp">{task.wtp}</div>
                                <div className="ticket-task-email">{task.email}</div>
                                <div className="ticket-task-time">
                                    {formatDate(task.submittedAt || task.timestamp || task.createdAt)}
                                </div>
                                <div className="ticket-task-token">
                                    {/* Chattlänk som även markerar ärendet som sett när det öppnas */}
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

            {/* KOLUMN 2: MINA ÄRENDEN - Ärenden som den aktuella användaren arbetar med */}
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

            {/* KOLUMN 3: KLARA - Avslutade och arkiverade ärenden */}
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
                            draggable={false} // Kan inte dras från "Klara"-kolumnen
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