import { useState } from 'react';
import { useGlobal } from '../GlobalContext'; // Import the global context hook

function UpdateUserInfo() {
  const [formData, setFormData] = useState({
    firstName: '',
    password: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get current user and update function from global context
  const { currentUser, updateUser } = useGlobal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setMessage('Lösenorden matchar inte');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!currentUser || !currentUser.id) {
        throw new Error('Du måste vara inloggad för att uppdatera lösenordet');
      }
      
      const updateData = {
        password: formData.password
      };
      
      // Only include firstName if it's provided
      if (formData.firstName.trim()) {
        updateData.firstName = formData.firstName;
      }
      
      const result = await updateUser(currentUser.id, updateData);

      if (result.success) {
        setMessage('Uppgifterna uppdaterades framgångsrikt!');
        setFormData({
          firstName: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setMessage(result.error || 'Ett fel uppstod vid uppdateringen');
      }
    } catch (error) {
      setMessage(error.message || 'Ett fel uppstod vid anslutning till servern');
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

  return (
    <div className="login-border">
      <form onSubmit={handleSubmit} className="login-container">
        <h1 className="admin-login">Uppdatera användaruppgifter</h1>

        <input
          type="text"
          name="firstName"
          placeholder="Nytt användarnamn"
          value={formData.firstName}
          onChange={handleInputChange}
          className="login-bar"
        />

        <input
          type="password"
          name="password"
          placeholder="Nytt lösenord"
          value={formData.password}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Bekräfta nytt lösenord"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          className="login-bar"
          required
        />

        {message && (
          <div className={message.includes('fel') || message.includes('matchar') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        <div className="login-knapp">
          <button
            type="submit"
            className="bla"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Uppdaterar...' : 'Uppdatera'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateUserInfo;