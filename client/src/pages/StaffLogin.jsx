import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../GlobalContext'; // Import the global context hook
import './StaffLogin.css';

function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  // Use the global context for authentication
  const { login } = useGlobal();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(username, password, rememberMe);
      
      if (result.success) {
        // Redirect to the appropriate dashboard based on user role_id
        const roleId = result.user.role_id;
        if (roleId === 2) { // Admin
          navigate('/admin/dashboard');
        } else if (roleId === 1) { // User
          navigate('/staff/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(result.error || 'Inloggningen misslyckades. Kontrollera dina uppgifter.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ett fel uppstod vid inloggning. Försök igen senare.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="staff-page-container">
      <div className="staff-login-container">
        <div className="staff-login-header">
          <h1 className="staff-login-title">Staff Portal</h1>
          <p className="staff-login-subtitle">Logga in för att fortsätta</p>
        </div>
        
        <form onSubmit={handleLogin} className="staff-login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="staff-field-group">
            <label className="staff-field-label">Användarnamn</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="staff-field-input"
              required
            />
          </div>
          
          <div className="staff-field-group">
            <label className="staff-field-label">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="staff-field-input"
              required
            />
          </div>
          
          <div className="staff-login-options">
            <div className="staff-remember-container">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="staff-remember-checkbox"
              />
              <label htmlFor="rememberMe" className="staff-remember-label">
                Kom ihåg mig
              </label>
            </div>
            <a href="#" className="staff-forgot-password">
              Glömt lösenord?
            </a>
          </div>
          
          <div className="staff-login-button-container">
            <button
              type="submit"
              disabled={isLoading}
              className={`staff-login-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? (
                <span className="button-loading-text">
                  <span className="button-spinner"></span>
                  Loggar in...
                </span>
              ) : 'LOGGA IN'}
            </button>
          </div>
          
          <div className="staff-login-footer">
            <p className="staff-login-help">
              Behöver du hjälp? <a href="#">Kontakta support</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
      
export default StaffLogin;