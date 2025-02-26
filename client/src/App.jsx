import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalProvider } from './GlobalContext';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Chat from './pages/Chat';
import Faq from './pages/Faq';

function App() {
  return (
    <GlobalProvider>
      <Router>
        <Routes>
          {/* Layout wraps ALL routes to keep navbar consistent */}
          <Route path="/" element={<Layout />}>
            {/* Home/Index route */}
            <Route index element={<DynamiskForm />} />
            
            {/* Chat route inside Layout */}
            <Route path="chat/:token" element={<Chat />} />
            
            {/* Dynamisk form */}
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
            
            {/* FAQ route */}
            <Route path="faq" element={<Faq />} />
          </Route>
        </Routes>
      </Router>
    </GlobalProvider>
  );
}

export default App;