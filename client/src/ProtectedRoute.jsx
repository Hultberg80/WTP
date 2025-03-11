import { Navigate, Outlet } from 'react-router-dom';
import { useGlobal } from './GlobalContext';

// Component to protect routes that require authentication
function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, currentUser } = useGlobal();
  
  // Add debugging to see what's happening
  console.log("ProtectedRoute Debug:", { 
    isAuthenticated, 
    currentUser, 
    allowedRoles 
  });

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/staff/login" replace />;
  }

  // Map role_id to role names for comparison
  // Based on your backend where:
  // role_id 1 = staff (regular user)
  // role_id 2 = admin
  const roleMap = {
    1: 'staff',
    2: 'admin'
  };
  
  // Fix the property name mismatch - use roleId instead of role_id
  const userRole = roleMap[currentUser?.roleId] || 'unknown';
  
  console.log("User role mapped:", userRole);

  // If specific roles are required and user doesn't have one of those roles
  if (allowedRoles.length > 0 && (!currentUser || !allowedRoles.includes(userRole))) {
    console.log("Access denied, redirecting...");
    // Redirect to an appropriate route based on user's role
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    } else {
      // Default fallback if user has an unrecognized role
      return <Navigate to="/" replace />;
    }
  }

  // If authenticated and has the right role (or no specific role was required),
  // render the child routes
  console.log("Access granted, rendering content");
  return <Outlet />;
}

export default ProtectedRoute;