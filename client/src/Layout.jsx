import { NavLink, Outlet, useLocation } from 'react-router-dom';

function Layout() {
  const location = useLocation();
  const isChatPage = location.pathname.includes('/chat/');

  return (
    <div className="app-container">
      {/* Navigation Header - Present on ALL pages */}
      <nav className="main-navigation">
        <div className="nav-container">
          <div className="nav-content">
            {/* Logo/Brand */}
            <h1 className="brand-title">Customer</h1>

            {/* Main Navigation */}
            <div className="nav-links-container">
              {/* Public NavLinks */}
              <div className="nav-section">
                <NavLink 
                  to={"/dynamisk"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Dynamiskt Formulär
                </NavLink>
                <NavLink 
                  to={"/faq"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  FAQ
                </NavLink>
              </div>

              {/* Admin NavLinks */}
              <div className="nav-section">
                <h2 className="nav-group-title">Admin Pages</h2>
                <NavLink 
                  to={"/admin/login"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Admin Login
                </NavLink>

                <NavLink 
                  to={"/admin/dashboard"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Dashboard
                </NavLink>

                <NavLink 
                  to={"/admin/create-user"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Create User
                </NavLink>
              </div>

              {/* Staff NavLinks */}
              <div className="nav-section">
                <h2 className="nav-group-title">Staff</h2>
                <NavLink 
                  to={"/staff/login"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Staff Login
                </NavLink>
                <NavLink 
                  to={"/staff/dashboard"}
                  className={({ isActive }) => 
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  Dashboard
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Changes based on route */}
      <main className={isChatPage ? "content-container chat-page" : "content-container"}>
        <Outlet />
      </main>

      {/* Footer - Present on ALL pages */}
      <footer className="main-footer">
        <div className="footer-container">
          <p>&copy; {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;