// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';

// Import admin pages
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard/Header';
import AdminLogin from './pages/AdminLogin';

// Import staff pages
import StaffDashboard from './pages/StaffDashboard/Header';  // Uppdaterad sökväg
import StaffLogin from './pages/StaffLogin';

// Import other pages
import Chat from './pages/Chat';
import Faq from './pages/Faq';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Startsida */}
          <Route index element={<DynamiskForm />} />
          <Route path="dynamisk" element={<DynamiskForm />} />
          
          {/* Admin routes - grupperade tillsammans */}
          <Route path="admin">
            <Route path="login" element={<AdminLogin />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="create-user" element={<AdminCreateUser />} />
          </Route>
          
          {/* Staff routes - grupperade tillsammans */}
          <Route path="staff">
            <Route path="login" element={<StaffLogin />} />
            <Route path="dashboard" element={<StaffDashboard />} />
          </Route>
          
          {/* Feature routes */}
          <Route path="chat/:token" element={<Chat />} />
          <Route path="faq" element={<Faq />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;