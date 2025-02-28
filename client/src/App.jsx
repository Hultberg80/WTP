import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalProvider } from './context'; // Importera GlobalProvider från context
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Chat from './pages/Chat';
import Faq from './pages/Faq';
import Main from './pages/StaffDashboard/Main'; // Importera den nya Main komponenten

function App() {
  return (
    <GlobalProvider> {/* Wrappa hela applikationen med GlobalProvider */}
      <Router>
        <Routes>
          {/* Chat route först för att hantera chat-token */}
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
              {/* Lägg till den nya Staff Main komponenten som använder context */}
              <Route path="main" element={<Main />} />
            </Route>
            
            <Route path="faq" element={<Faq />} />
          </Route>
        </Routes>
      </Router>
    </GlobalProvider>
  );
}

export default App;