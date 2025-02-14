import { useState, useEffect } from "react";

function Main() {

  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  console.log(submissions);
  useEffect(() => {
    console.log("Tasks after fetch:", tasks);
  }, [tasks]);


  // Hämta form submissions när komponent laddas
  useEffect(() => {
    fetchFordonForms(), fetchForsakringsForms(), fetchTeleForms();
  }, []);


  // Hämta submissions från API
  const fetchFordonForms = async () => {
    try {
      const response = await fetch('/api/fordon');
      if (response.ok) {
        const data = await response.json();
        

        // Filtrera för att bara få fram aktiva submissions som inte redann är tickets
        const activeSubmissions = data.filter(sub => sub.email);
        

        // Skapa tickets från nya submissions
        const baseUrl = "http://localhost:3001";
        const newTicket = activeSubmissions.map(submission => ({
          id: submission.id,
          chatToken: submission.chatToken,
          issueType: `${submission.firstName}  - ${submission.companyType}`,
          wtp: submission.issueType,
          email: submission.email,
          message: submission.message,
          submittedAt: submission.submittedAt || submission.createdAt,
          chatLink: `${baseUrl}/chat/${submission.chatToken}`
        }));

        // Uppdatera tasks med nya tickets som inte redan finns
        setTasks(prevTasks => {
          const existingIds = prevTasks.map(task => task.id);
          const uniqueNewTickets = newTicket.filter(ticket => !existingIds.includes(ticket.id));
          const updatedTasks = [...prevTasks, ...uniqueNewTickets];

          
          return updatedTasks/*[...prevTasks, ...uniqueNewTickets]*/;
        });

        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    }
  };

    // Hämta submissions från API
    const fetchForsakringsForms = async () => {
      try {
        const response = await fetch('/api/forsakring');
        if (response.ok) {
          const data = await response.json();
          
  
          // Filtrera för att bara få fram aktiva submissions som inte redann är tickets
          const activeSubmissions = data.filter(sub => sub.email);
          
  
          // Skapa tickets från nya submissions
          const baseUrl = "http://localhost:3001";
          const newTicket = activeSubmissions.map(submission => ({
            id: submission.id,
            chatToken: submission.chatToken,
            insuranceType: submission.insuranceType,
            issueType: `${submission.firstName}  - ${submission.companyType}`,
            wtp: submission.issueType,
            email: submission.email,
            message: submission.message,
            submittedAt: submission.submittedAt || submission.createdAt,
            chatLink: `${baseUrl}/chat/${submission.chatToken}`
          }));
  
          // Uppdatera tasks med nya tickets som inte redan finns
          setTasks(prevTasks => {
            const existingIds = prevTasks.map(task => task.id);
            const uniqueNewTickets = newTicket.filter(ticket => !existingIds.includes(ticket.id));
            const updatedTasks = [...prevTasks, ...uniqueNewTickets];
  
            
            return updatedTasks/*[...prevTasks, ...uniqueNewTickets]*/;
          });
  
          setSubmissions(data);
        }
      } catch (error) {
        console.error('Error fetching submission:', error);
      }
    };

      // Hämta submissions från API
  const fetchTeleForms = async () => {
    try {
      const response = await fetch('/api/tele');
      if (response.ok) {
        const data = await response.json();
        

        // Filtrera för att bara få fram aktiva submissions som inte redann är tickets
        const activeSubmissions = data.filter(sub => sub.email);
        

        // Skapa tickets från nya submissions
        const baseUrl = "http://localhost:3001";
        const newTicket = activeSubmissions.map(submission => ({
          id: submission.id,
          chatToken: submission.chatToken,
          issueType: `${submission.firstName}  - ${submission.companyType}`,
          wtp: submission.issueType,
          email: submission.email,
          message: submission.message,
          serviceType: submission.serviceType,
          submittedAt: submission.submittedAt || submission.createdAt,
          chatLink: `${baseUrl}/chat/${submission.chatToken}`
        }));

        // Uppdatera tasks med nya tickets som inte redan finns
        setTasks(prevTasks => {
          const existingIds = prevTasks.map(task => task.id);
          const uniqueNewTickets = newTicket.filter(ticket => !existingIds.includes(ticket.id));
          const updatedTasks = [...prevTasks, ...uniqueNewTickets];

          
          return updatedTasks/*[...prevTasks, ...uniqueNewTickets]*/;
        });

        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    }
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };


  const handleDrop = (setTargetColumn, targetColumn) => {
    if (draggedTask) {
      setTasks((prev) => prev.filter((task) => task.id !== draggedTask.id));
      setMyTasks((prev) => prev.filter((task) => task.id !== draggedTask.id));
      setDone((prev) => prev.filter((task) => task.id !== draggedTask.id));

      setTargetColumn([...targetColumn, draggedTask]);
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
    if (!dateString) return "No date";

    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

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
        <h2 className="ticket-tasks-header">Tasks</h2>
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
                Token: <a href={task.chatLink} target="_blank" rel="noopener noreferrer">Link to Chat</a>
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
        <h2 className="ticket-my-tasks-header">My Tasks</h2>
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
                Token: <a href={task.chatLink} target="_blank" rel="noopener noreferrer">Link to Chat</a>
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
        <h2 className="ticket-done-header">Done</h2>
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
              <div className="ticket-task-email">{task.email}</div>
              <div className="ticket-task-time">{formatDate(task.submittedAt)}</div>
              <div className="ticket-task-token">
                Token: <a href={task.chatLink} target="_blank" rel="noopener noreferrer">Link to Chat</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Main;