import { useNavigate } from 'react-router-dom';
import { useGlobal } from './GlobalContext';

function AuthStatus() {
  const { isAuthenticated, currentUser, logout } = useGlobal();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-status">
        <a href="/staff/login" className="auth-login-button">
          Logga in
        </a>
      </div>
    );
  }

  // Fix the property name mismatch - use roleId instead of role_id
  let roleName = 'Unknown';
  if (currentUser?.roleId === 2) {
    roleName = 'Admin';
  } else if (currentUser?.roleId === 1) {
    roleName = 'Staff';
  }

  return (
    <div className="auth-status">
      <div className="auth-user-info">
        <span className="auth-user-name">{currentUser?.username || 'User'}</span>
        <span className="auth-user-role">{roleName}</span>
      </div>
      <button onClick={handleLogout} className="auth-logout-button">
        Logga ut
      </button>
    </div>
  );
}

export default AuthStatus;