import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
// Fixed import - Main component instead of Header
import StaffDashboard from './pages/StaffDashboard/Main';
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
    if (currentUser?.roleId === 2) { // Admin - use roleId instead of role_id
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser?.roleId === 1) { // Staff/User - use roleId instead of role_id
      return <Navigate to="/staff/dashboard" replace />;
    }
  }
  
  // Otherwise, show the form for customers
  return <DynamiskForm />;
}

// Debug component
function DebugComponent() {
  const { isAuthenticated, currentUser } = useGlobal();
  
  return (
    <div style={{ padding: 20, background: '#f0f0f0', margin: 20 }}>
      <h2>Debug Information</h2>
      <p>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      <p>User Info: {JSON.stringify(currentUser, null, 2)}</p>
    </div>
  );
}

function App() {
  const { isAuthenticated, currentUser, triggerRefresh } = useGlobal();

  useEffect(() => {
    console.log("App mounted, authentication status:", { isAuthenticated, currentUser });
    
    // Try to refresh the authentication status on app load
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/login');
        console.log('Auth response status:', response.status);
        if (response.ok) {
          const text = await response.text();
          console.log('Auth response text:', text);
          if (text) {
            try {
              const data = JSON.parse(text);
              console.log('Parsed auth data:', data);
            } catch (e) {
              console.error('Failed to parse auth response:', e);
            }
          }
        }
      } catch (e) {
        console.error('Auth check error in App:', e);
      }
    };
    
    checkAuth();
  }, [isAuthenticated, currentUser]);

  return (
    <Router>
      <DebugComponent />
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
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
            <Route path="staff">
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="update-password" element={<UpdateUserInfo />} />
            </Route>
          </Route>
          
          <Route path="faq" element={<Faq />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;