import { useEffect } from "react";
import Aside from "./Aside";
import { useGlobalContext } from "../../GlobalContext";

function Main() {
    const {
        tasks,
        myTasks,
        done,
        dashboardLoading,
        dashboardError,
        setupDashboardPolling,
        handleDragStart,
        handleDrop,
        handleDragOver,
        handleTaskEdit,
        formatDate,
        setTasks,
        setMyTasks,
        setDone
    } = useGlobalContext();

    // Setup dashboard polling on mount
    useEffect(() => {
        const cleanup = setupDashboardPolling();
        return cleanup;
    }, [setupDashboardPolling]);

    // Show loading state
    if (dashboardLoading) {
        return <div className="main-container">
            <Aside />
            <div className="loading">Laddar ärenden...</div>
        </div>;
    }

    // Show error state
    if (dashboardError) {
        return <div className="main-container">
            <Aside />
            <div className="error">{dashboardError}</div>
        </div>;
    }

    return (
        <div className="main-container">
            <Aside />

            {dashboardError && (
                <div className="dashboard-connection-error">
                    <p>{dashboardError}</p>
                    <button onClick={setupDashboardPolling}>Försök igen</button>
                </div>
            )}

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
                            <div className="ticket-task-time">{formatDate(task.submittedAt || task.timestamp)}</div>
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