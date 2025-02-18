// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import SuperDynamisk from './SuperDynamisk';

// Import admin pages
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

// Import staff pages
import StaffDashboard from './pages/StaffDashboard/Header';  // Uppdaterad sökväg
import StaffLogin from './pages/StaffLogin';

// Import other pages
import Chat from './pages/Chat';
import Faq from './pages/Faq';
import { useEffect, useState } from 'react';

function App() {

  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);

  // Hämta formulär från API
  useEffect(() => {
    fetch("http://localhost:5000/api/forms")
    .then((res) => res.json())
    .then((data) => {
      setForms(data);
      if (data.length > 0) setSelectedForm(data[0]); //Första formuläret är standard
    })
     .catch((err) => console.error("Error fetching forms:", err));  
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Startsida */}
          <Route index element={<DynamiskForm />} />
          <Route path="dynamisk" element={<DynamiskForm />} />
          <Route index element={<SuperDynamisk />} />
          <Route path="superDynamisk" element={<SuperDynamisk />} />
          
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