
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(username, password, company);
    if (success) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="login-border">
      <h1 className="admin-login">Admin Login</h1>

      <form onSubmit={handleLogin} className="login-container">
        <input 
          type="text" 
          placeholder='Ange ditt användarnamn'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-bar"
          required
        />

        <input 
          type="password"
          placeholder='Ange ditt lösenord'
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="login-bar"
          required
        />

        <select 
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="login-bar"
          required
        >
          <option value="" disabled>Välj företag</option>
          <option value="fordon">Fordonsservice</option>
          <option value="tele">Tele/Bredband</option>
          <option value="forsakring">Försäkringsärenden</option>
        </select>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className='login-knapp'>
          <button 
            type='submit'
            className="bla"
            disabled={loading}
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminLogin;