import { useState, useEffect, useCallback, useRef } from "react";

function Main() {
    const [tasks, setTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [done, setDone] = useState([]);
    const [draggedTask, setDraggedTask] = useState(null);
    const intervalRef = useRef(null);

    const fetchTickets = useCallback(async () => {
        try {
            const response = await fetch('/api/tickets');
            const data = await response.json();
            
            const newTickets = data.map(ticket => ({
                ...ticket,
                id: ticket.chattoken,
                issueType: `${ticket.sender} - ${ticket.issuetype}`,
                companyType: ticket.companytype,
                chatLink: `http://localhost:3001/chat/${ticket.chattoken}`
            }));

            updateTasks(newTickets);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
        
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        intervalRef.current = setInterval(fetchTickets, 30000);
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchTickets]);

    const updateTasks = (newTickets) => {
        setTasks(prevTasks => {
            const existingTasks = new Map(prevTasks.map(task => [task.chattoken, task]));
            
            const updatedTasks = newTickets.map(ticket => ({
                ...ticket,
                ...existingTasks.get(ticket.chattoken)
            }));

            return updatedTasks.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        });
    };

    const handleDragStart = (task) => {
        setDraggedTask(task);
    };

    const handleDrop = (setTargetColumn, targetColumn) => {
        if (draggedTask) {
            setTasks(prev => prev.filter(task => task.id !== draggedTask.id));
            setMyTasks(prev => prev.filter(task => task.id !== draggedTask.id));
            setDone(prev => prev.filter(task => task.id !== draggedTask.id));

            setTargetColumn(prev => [...prev, draggedTask]);
            setDraggedTask(null);
        }
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleTaskEdit = (taskId, newContent, setColumn) => {
        setColumn(prev => prev.map(task => 
            task.id === taskId
            ? { ...task, content: newContent }
            : task
        ));
    };

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

    return (
        <div className="main-container">
            <aside className="staff-aside">
                <h2 className="company-name">Företagsnamn</h2>
                <div>Martin</div>
                <div>Ville</div>
                <div>Kevin</div>
                <div>Shaban</div>
                <div>Sigge</div>
                <div>Sebbe</div>
                Inloggad support
            </aside>

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
                        <div className="ticket-task-content" 
                             contentEditable
                             suppressContentEditableWarning={true}
                             onBlur={(e) => handleTaskEdit(task.id, e.currentTarget.textContent, setTasks)}
                        >
                            {task.issueType}
                        </div>
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.companyType}</div>
                            <div className="ticket-task-email">{task.email}</div>
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
                            {task.issueType}
                        </div>
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.companyType}</div>
                            <div className="ticket-task-email">{task.email}</div>
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
                            {task.issueType}
                        </div>
                        <div className="ticket-task-details">
                            <div className="ticket-wtp">{task.companyType}</div>
                        
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