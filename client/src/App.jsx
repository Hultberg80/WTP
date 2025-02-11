// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Form from "./Form";

// Import your pages
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Chat from './pages/Chat';
import Faq from './pages/Faq';
import FormPage from './pages/FormPage';
import StaffDashboard from './pages/StaffDashboard';
import StaffLogin from './pages/StaffLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Nest all routes inside Layout */}
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

          {/* Other routes */}
          <Route path="chat" element={<Chat />} />
          <Route path="faq" element={<Faq />} />
          <Route path="form" element={<Form />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;