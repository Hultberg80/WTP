import { useState } from 'react';

function AdminCreateUser() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  
  
  
  const handleLogin = () => {
    //e.preventDefault();   om man vill att sidan inte ska laddas om
    console.log("Admin login:", { username, password });
  };
  
  
      return (
        <div className="login-border">
          <h1 className="admin-login">Skapa användare</h1>
  
          <form onSubmit={handleLogin} className="login-container">
            
  
  
  
            <input type="text" 
            placeholder='Ange ett användarnamn'
            value={username}
  
            onChange={(e) => setUsername(e.target.value)}
            className="login-bar"
            required/>
  
            <input type="password"
            placeholder='Ange ett lösenord'
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="login-bar"
            required/>
  
  
  
  
            <select type="företag"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="login-bar"
            required
            >
            <option value="" disabled selected>Välj företag</option>
              <option value="bilar">Tesla</option>
            <option value="mat">Maxi</option>
            <option value="lökar">något annat</option>
        
            </select>
  
  
  
  
            <div className='login-knapp'>
            <button 
            type='submit'
            className="bla">Skapa användare</button>
            </div>
  
  
  </form>
  
  
  
        </div>
    );
  }
  export default AdminCreateUser;