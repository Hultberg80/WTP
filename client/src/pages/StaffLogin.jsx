import { useState } from 'react';

import './StaffLogin.css';

function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    console.log("Email:" + email + " password: " + password)

    const response = await fetch("/api/newlogin", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email, password}),
      credentials: "include"
    }
    )
    if(response.ok){
      const data = await response.json();
      console.log(data)
      setIsLoading(false)
    }
    
    // Simulate login request
    
  };

  return (
    <div className="staff-page-container">
      <div className="staff-login-container">
        <div className="staff-login-header">
          <h1 className="staff-login-title">Staff Portal</h1>
          <p className="staff-login-subtitle">Logga in för att fortsätta</p>
        </div>
        
        <form onSubmit={handleLogin} className="staff-login-form">
          <div className="staff-field-group">
            <label className="staff-field-label">Användarnamn</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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