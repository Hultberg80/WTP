import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import Layout from './Layout';
import DynamiskForm from './DynamiskForm';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard/Header';
import StaffLogin from './pages/StaffLogin';
import Faq from './pages/Faq';
import UpdateUserInfo from './pages/UpdatePassword';
import { useChat } from './ChatContext';
import ProtectedRoute from './ProtectedRoute';

function ChatRedirect({ match }) {
  const { openChat } = useChat();
  const token = window.location.pathname.split('/chat/')[1];
  
  useEffect(() => {
    if (token) {
      openChat(token);
    }
  }, [token, openChat]);
  
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/chat/:token" element={<ChatRedirect />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<DynamiskForm />} />
            <Route path="dynamisk" element={<DynamiskForm />} />
            
            <Route path="admin">
              <Route path="dashboard" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="create-user" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminCreateUser />
                </ProtectedRoute>
              } />
            </Route>
            
            <Route path="staff">
              <Route path="login" element={<StaffLogin />} />
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <StaffDashboard />
                </ProtectedRoute>
              } />
              <Route path="update-user" element={
                <ProtectedRoute>
                  <UpdateUserInfo />
                </ProtectedRoute>
              } />
            </Route>
            
            <Route path="faq" element={<Faq />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App;