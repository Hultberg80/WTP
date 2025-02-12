// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Form from "./Form";
import DynamiskForm from './DynamiskForm';  // Uppdaterad import

// Import your pages
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Chat from './pages/Chat';
import ChatLayout from './pages/ChatLayout';
import Faq from './pages/Faq';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Grundformulär som startsida */}
          <Route index element={<Form />} />
          
          {/* Dynamiskt CRM-formulär på egen route */}
          <Route path="dynamisk" element={<DynamiskForm />} />
          
          {/* Admin routes */}
          <Route path="admin">
            <Route path="login" element={<AdminLogin />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="create-user" element={<AdminCreateUser />} />  
          </Route>

          {/* Staff routes */}
          <Route path="staff">
            <Route path="login" element={<StaffLogin />} />
            <Route path="dashboard" element={<StaffDashboard />} />
          </Route>

          {/* Other routes */}
          <Route path="chat" element={<Chat />} />
          <Route path="ChatLayout" element={<ChatLayout />} />
          <Route path="faq" element={<Faq />} />
          <Route path="form" element={<Form />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;