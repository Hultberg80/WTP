import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Form from "./Form";

// Imports för sidor
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ChatLayout from './pages/ChatLayout';
import Faq from './pages/Faq';
import StaffDashboard from './pages/StaffDashboard/Header'; // Uppdatera denna sökväg
import StaffLogin from './pages/StaffLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Startsida */}
          <Route index element={<Form />} />
          
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
          
          {/* Chat route */}
          <Route path="chat/:token" element={<ChatLayout />} />
          
          {/* Övriga routes */}
          <Route path="faq" element={<Faq />} />
          <Route path="form" element={<Form />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;