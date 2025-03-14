// Importerar useState från React för att hantera state
import { useState } from 'react';
// Importerar NavLink, Outlet och useNavigate från react-router-dom för routing och navigering
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
// Importerar useAuth-hooken för att hantera autentisering och användarinformation
import { useAuth } from './AuthContext';

function Layout() {
  // State för att hantera om den mobila menyn är öppen
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Hämtar användardata, logout-funktion och inloggningsstatus från AuthContext
  const { user, logout, isLoggedIn } = useAuth();
  // useNavigate-hooken för att programmatisk navigering
  const navigate = useNavigate();

  // Funktion för att toggla (öppna/stänga) den mobila menyn
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Funktion som hanterar utloggning med backend-sessionrensning
  const handleLogout = async () => {
    console.log("Logout initiated");
    await logout(); // Anropar logout-funktionen som även rensar sessionen på backend
    console.log("Logout completed, redirecting to login page");
    // Navigerar till inloggningssidan för staff
    navigate('/staff/login');
  };

  return (
    <div>
      {/* Navigationsheader */}
      <nav>
        <div>
          <div>
            {/* Vänster del: Logo/Brand */}
            <div className="navbar-left">
              <h1 className="project-name">WPT</h1>
              
              {/* Om användaren är inloggad och har ett företag, visa företagets logotyp och namn */}
              {isLoggedIn && user && user.companyLogo && (
                <div className="company-branding">
                  <img 
                    src={user.companyLogo} 
                    alt={`${user.company} logo`}
                    className="company-logo" 
                  />
                  <span className="company-name">{user.company}</span>
                </div>
              )}
              
            </div>
            {/* Mitten: Navigation länkar */}
            <div className="navbar-center">
              {/* Här kan du lägga till fler navigationslänkar */}
            </div>

            {/* Knapp för mobil meny */}
            <button className="mobile-menu-button" onClick={toggleMenu}>
              {menuOpen ? '✕' : '☰'}
            </button>

            {/* Huvudmenyn */}
            <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
              {/* Publika navigationslänkar */}
              <div>
                <NavLink 
                  to={"/dynamisk"}
                  className="hover:text-blue-300 transition-colors"
                  onClick={() => setMenuOpen(false)} // Stänger menyn vid klick
                >
                  Dynamiskt Formulär
                </NavLink>
                <NavLink 
                  to={"/faq"}
                  className="hover:text-blue-300 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  FAQ
                </NavLink>
              </div>

              {/* Admin-navigationslänkar - visas endast om användaren är inloggad som admin */}
              {isLoggedIn && user && user.role === 'admin' && (
                <div>
                  <h2>Admin</h2>
                  <NavLink 
                    to={"/admin/dashboard"} 
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </NavLink>

                  <NavLink 
                    to={"/admin/create-user"}
                    onClick={() => setMenuOpen(false)}
                  >
                    Create User
                  </NavLink>
                </div>
              )}

              {/* Personal (staff) navigationslänkar */}
              <div>
                {isLoggedIn && (
                  <>
                    <NavLink 
                      to={"/staff/dashboard"}
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </NavLink>

                    <NavLink 
                      to={"/staff/update-user"}
                      onClick={() => setMenuOpen(false)}
                    >
                      Update password
                    </NavLink>
                  </>
                )}
              </div>
            </div>
            
            {/* Höger del: Inloggnings-/användarinformation */}
            <div className="navbar-right">
              {isLoggedIn && user ? (
                <div className="user-menu">
                  {/* Visar användarens namn */}
                  <span className="user-name">{user.username}</span>
                  {/* Logout-knapp som anropar handleLogout */}
                  <button onClick={handleLogout} className="logout-button">Logga ut</button>
                </div>
              ) : (
                // Om användaren inte är inloggad, visa en länk till inloggningssidan med en ikon
                <NavLink to="/staff/login">
                  <img src="/img/login.png" alt="Logga in" className="login-img"/>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Huvudinnehåll */}
      <main>
        {/* Outlet renderar de barnkomponenter som matchar den aktuella routen */}
        <Outlet />
      </main>

      {/* Footer */}
      <footer>
        <div>
          {/* Visar aktuellt år och copyright-information */}
          <p>&copy; {new Date().getFullYear()} All rights reversed</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;