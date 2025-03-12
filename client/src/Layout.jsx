// Layout.jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Layout() {
  // State for mobile menu
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Get auth context and navigation
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Handle logout with backend session clearing
  const handleLogout = async () => {
    console.log("Logout initiated");
    await logout(); // This now calls the backend logout endpoint
    console.log("Logout completed, redirecting to login page");
    navigate('/staff/login');
  };

  return (
    <div>
      {/* Navigation Header */}
      <nav>
        <div>
          <div>
            {/* Logo/Brand on the left */}
            <div className="navbar-left">
              <h1 className="project-name">WPT</h1>
              
              {/* Display company logo if user is logged in and has a company */}
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
            {/* Navigation Links in the middle */}
            <div className="navbar-center">
              {/* Your nav links here */}
            </div>

            {/* Mobile menu button */}
            <button className="mobile-menu-button" onClick={toggleMenu}>
              {menuOpen ? '✕' : '☰'}
            </button>

            {/* Main Navigation */}
            <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
              {/* Public NavLinks */}
              <div>
                <NavLink 
                  to={"/dynamisk"}
                  className="hover:text-blue-300 transition-colors"
                  onClick={() => setMenuOpen(false)}
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

              {/* Admin NavLinks - Only shown when user is logged in as admin */}
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

              {/* Staff NavLinks - Only shown when user is logged in */}
              {isLoggedIn && (
                <div>
                  <h2>Staff</h2>
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
                </div>
              )}
            </div>
            
            {/* Login/User info on right */}
            <div className="navbar-right">
              {isLoggedIn && user ? (
                <div className="user-menu">
                  <span className="user-name">{user.username}</span>
                  <button onClick={handleLogout} className="logout-button">Logga ut</button>
                </div>
              ) : (
                <NavLink to="/staff/login">
                  <img src="/img/login2.png" alt="Logga in" className="login-img"/>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer>
        <div>
          <p>&copy; {new Date().getFullYear()} All rights reversed</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;