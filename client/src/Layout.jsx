// Layout.jsx
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useGlobal } from './GlobalContext'; // Import the global context hook
import AuthStatus from './AuthStatus'; // Import the auth status component

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, currentUser } = useGlobal();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
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

              {/* Admin NavLinks - only show if user is authenticated and has admin role */}
              {isAuthenticated && currentUser?.role_id === 2 && (
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

              {/* Staff NavLinks - show login to unauthenticated users, show dashboard to authenticated staff/admin */}
              <div>
                <h2>Staff</h2>
                
                {!isAuthenticated ? (
                  <NavLink 
                    to={"/staff/login"}
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </NavLink>
                ) : (
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
            
            {/* Auth status indicator on the right */}
            <div className="navbar-right">
              <AuthStatus />
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
          <p>&copy; { new Date().getFullYear()} All rights reversed</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;