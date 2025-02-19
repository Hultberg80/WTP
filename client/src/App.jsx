import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard/Header';
import AdminLogin from './pages/AdminLogin';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Chat from './pages/Chat';
import Faq from './pages/Faq';

function App() {
  return (
    <Router>
      <Routes>
        {/* Chat route först */}
        <Route path="/chat/:token" element={<Chat />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<DynamiskForm />} />
          <Route path="dynamisk" element={<DynamiskForm />} />
          
          <Route path="admin">
            <Route path="login" element={<AdminLogin />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="create-user" element={<AdminCreateUser />} />
          </Route>
          
          <Route path="staff">
            <Route path="login" element={<StaffLogin />} />
            <Route path="dashboard" element={<StaffDashboard />} />
          </Route>
          
          <Route path="faq" element={<Faq />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;