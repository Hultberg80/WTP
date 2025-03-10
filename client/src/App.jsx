import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Chat from './pages/Chat';
import Faq from './pages/Faq';
import UpdateUserInfo from './pages/UpdatePassword';
import { useChat } from './ChatContext'; // Importera useChat hook

function ChatRedirect({ match }) {
  // Detta är en komponent som omdirigerar /chat/:token till huvudsidan och öppnar modalen
  const { openChat } = useChat();
  const token = window.location.pathname.split('/chat/')[1];
  
  useEffect(() => {
    if (token) {
      // Öppna chatten via context när komponenten mountas
      openChat(token);
    }
  }, [token, openChat]);
  
  // Omdirigera till huvudsidan
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Ersätt Chat-routen med ChatRedirect */}
        <Route path="/chat/:token" element={<ChatRedirect />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<DynamiskForm />} />
          <Route path="dynamisk" element={<DynamiskForm />} />
          
          <Route path="admin">
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="create-user" element={<AdminCreateUser />} />
          </Route>
          
          <Route path="staff">
            <Route path="login" element={<StaffLogin />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="update-user" element={<UpdateUserInfo />} />
          </Route>
          
          <Route path="faq" element={<Faq />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;