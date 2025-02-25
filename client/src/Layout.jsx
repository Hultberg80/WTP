// Layout.jsx
import { NavLink, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      {/* Navigation Header */}
      <nav>
        <div>
          <div className="navbar-content">
            {/* Logo/Brand on the left */}
            <div className="navbar-left">
              <h1 className="project-name">WPT</h1>
            </div>

            {/* Main Navigation */}
            <div className="navbar-center">
              {/* Public NavLinks */}
              <div>
                <NavLink 
                  to={"/dynamisk"}
                  className="hover:text-blue-300 transition-colors"
                >
                  Dynamiskt Formulär
                </NavLink>
                <NavLink 
                  to={"/faq"}
                  className="hover:text-blue-300 transition-colors"
                >
                  FAQ
                </NavLink>
              </div>

              {/* Admin NavLinks */}
              <div>
                <h2>Admin Pages</h2>
                <NavLink 
                  to={"/admin/login"}
                >
                  Admin Login
                </NavLink>

                <NavLink 
                  to={"/admin/dashboard"} 
                >
                  Dashboard
                </NavLink>

                <NavLink 
                  to={"/admin/create-user"}
                >
                  Create User
                </NavLink>
              </div>

              {/* Staff NavLinks */}
              <div>
                <h2>Staff</h2>
                <NavLink 
                  to={"/staff/login"}
                >
                  Staff Login
                </NavLink>
                <NavLink 
                  to={"/staff/dashboard"}
                >
                  Dashboard
                </NavLink>
              </div>

              {/* Chat */}
              <NavLink 
                to={"chat"}
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