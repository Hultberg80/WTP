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

  return (
    <div className="auth-status">
      <div className="auth-user-info">
        <span className="auth-user-name">{currentUser?.username || 'User'}</span>
        <span className="auth-user-role">
          {currentUser?.role_id === 2 ? 'Admin' : currentUser?.role_id === 1 ? 'Staff' : 'Unknown role'}
        </span>
      </div>
      <button onClick={handleLogout} className="auth-logout-button">
        Logga ut
      </button>
    </div>
  );
}

export default AuthStatus;