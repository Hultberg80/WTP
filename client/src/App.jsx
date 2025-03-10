import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Faq from './pages/Faq';
import UpdateUserInfo from './pages/UpdatePassword';
import ProtectedRoute from './ProtectedRoute';
import { useGlobal } from './GlobalContext';

// Simple redirect component for chat routes
function ChatRedirect() {
  // Simply redirect to the main page - no chat opening functionality
  return <Navigate to="/" replace />;
}

// Component for the home route that redirects staff to dashboard
function HomeRedirect() {
  const { isAuthenticated, currentUser } = useGlobal();
  
  // If user is authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    if (currentUser?.role_id === 2) { // Admin
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser?.role_id === 1) { // Staff/User
      return <Navigate to="/staff/dashboard" replace />;
    }
  }
  
  // Otherwise, show the form for customers
  return <DynamiskForm />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Chat redirect route */}
        <Route path="/chat/:token" element={<ChatRedirect />} />
        
        <Route path="/" element={<Layout />}>
          {/* Home route with conditional redirect */}
          <Route index element={<HomeRedirect />} />
          
          {/* Form route for customers */}
          <Route path="dynamisk" element={<DynamiskForm />} />
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin">
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="create-user" element={<AdminCreateUser />} />
            </Route>
          </Route>
          
          {/* Staff Login Route (public) */}
          <Route path="staff/login" element={<StaffLogin />} />
          
          {/* Protected Staff/User Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'user']} />}>
            <Route path="staff">
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="update-user" element={<UpdateUserInfo />} />
            </Route>
          </Route>
          
          <Route path="faq" element={<Faq />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;