// client/src/pages/AdminDashboard.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';

function AdminDashboard() {
  const { isAuthenticated, user, role, logout, DEV_MODE } = useAuth();
  const navigate = useNavigate();
  
  // Skip auth check in dev mode
  useEffect(() => {
    if (!DEV_MODE && (!isAuthenticated || role !== 'admin')) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, role, navigate, DEV_MODE]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Skip auth check in dev mode
  if (!DEV_MODE && (!isAuthenticated || role !== 'admin')) {
    return null; // Or a loading spinner while redirecting
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div>
          <span className="mr-4">Välkommen, {user || 'Admin'}</span>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logga ut
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <button 
          onClick={() => navigate('/admin/create-user')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Skapa användare
        </button>
        
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Visa statistik
        </button>
      </div>
      
      {/* Dashboard content */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Systemöversikt</h2>
        <p>Här skulle du se statistik, rapporter och systemstatus.</p>
        
        {DEV_MODE && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
            <p className="text-yellow-800">
              <strong>Dev-läge aktivt:</strong> Autentisering kringgås för utveckling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;