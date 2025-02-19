import { useState, useEffect, useCallback, useRef } from "react";

function Main() {
    const [tasks, setTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [done, setDone] = useState([]);
    const [draggedTask, setDraggedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const fetchTickets = useCallback(async () => {
        try {
            // Always set loading to true on initial component mount
            if (!intervalRef.current) {
                setLoading(true);
            }
            setError(null);

            const response = await fetch('/api/tickets');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const newTickets = data.map(ticket => ({
                ...ticket,
                id: ticket.chatToken,
                issueType: `${ticket.sender} - ${ticket.formType}`,
                wtp: ticket.formType,
                chatLink: `http://localhost:3001/chat/${ticket.chatToken}`
            }));

            updateTasks(newTickets);
        } catch (error) {
            console.error("Error fetching tickets:", error);
            setError("Kunde inte hämta ärenden. Försök igen senare.");
        } finally {
            setLoading(false);
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
            const existingTasks = new Map(prevTasks.map(task => [task.chatToken, task]));

            const updatedTasks = newTickets.map(ticket => ({
                ...ticket,
                ...existingTasks.get(ticket.chatToken)
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

    // Only show loading initially, not on refresh
    if (loading && tasks.length === 0) {
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
                <div className="ticket-tasks">
                    <h2 className="ticket-tasks-header">Ärenden</h2>
                    <div className="p-4 space-y-4">
                        <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
                        <div className="text-gray-500 text-center mt-4">Laddar ärenden...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="main-container">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>{error}</p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="retry-button mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Försök igen
                </button>
            </div>
        );
    }

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