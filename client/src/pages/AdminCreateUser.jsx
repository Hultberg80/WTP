// client/src/pages/AdminCreateUser.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';

function AdminCreateUser() {
  const [formData, setFormData] = useState({
    firstName: '',
    password: '',
    company: '',
    role: '',
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, role, createUser, DEV_MODE } = useAuth();
  const navigate = useNavigate();

  // Skip auth check in dev mode
  useEffect(() => {
    if (!DEV_MODE && (!isAuthenticated || role !== 'admin')) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, role, navigate, DEV_MODE]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      await createUser(formData);
      setMessage('Användare skapades framgångsrikt!');
      setFormData({
        firstName: '',
        password: '',
        company: '',
        role: '',
      });
    } catch (error) {
      console.error('Error:', error);
      setMessage('Ett fel uppstod när användaren skulle skapas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Skip auth check in dev mode
  if (!DEV_MODE && (!isAuthenticated || role !== 'admin')) {
    return null; // Or a loading spinner while redirecting
  }

  return (
    <div className="login-border">
      <h1 className="admin-login">Skapa användare</h1>

      <form onSubmit={handleSubmit} className="login-container">
        <input
          type="text"
          name="firstName"
          placeholder="Ange ett användarnamn"
          value={formData.firstName}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Ange ett lösenord"
          value={formData.password}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        <select
          name="company"
          value={formData.company}
          onChange={handleInputChange}
          className="login-bar"
          required
        >
          <option value="">Välj företag</option>
          <option value="fordon">Fordonsservice</option>
          <option value="tele">Tele/Bredband</option>
          <option value="forsakring">Försäkringsärenden</option>
        </select>

        <select
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          className="login-bar"
          required
        >
          <option value="">Välj roll</option>
          <option value="admin">Super-admin</option>
          <option value="user">Företags-admin</option>
          <option value="staff">Kundtjänst</option>
        </select>

        {message && (
          <div className={message.includes('fel') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        <div className="login-knapp">
          <button
            type="submit"
            className="bla"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Skapar användare...' : 'Skapa användare'}
          </button>
        </div>
        
        {DEV_MODE && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
            <p className="text-yellow-800">
              <strong>Dev-läge aktivt:</strong> Användare kommer bara att skapas i konsolen.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export default AdminCreateUser;