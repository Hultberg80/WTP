// Layout.jsx
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

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

              {/* Admin NavLinks */}
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

              {/* Staff NavLinks */}
              <div>
                <h2>Staff</h2>
                <NavLink 
                  to={"/staff/login"}
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink 
                  to={"/staff/dashboard"}
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </NavLink>

                <NavLink 
                  to={"/staff/update-user"}
                >
                  Update password
                </NavLink>

              </div>

              {/* Chat */}
              <NavLink 
                to={"chat"}
                onClick={() => setMenuOpen(false)}
              >
                Chat
              </NavLink>
            </div>
            {/* Login icon on the right */}
            <div className="navbar-right">
              <a href="">
                <img src="/img/login.png" alt="Logga in" className="login-img"/>
              </a>
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