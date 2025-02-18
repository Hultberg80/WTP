// Layout.jsx
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      {/* Navigation Header */}
      <nav>
        <div>
          <div>
            {/* Logo/Brand */}
            <h1>Customer</h1>

            {/* Main Navigation */}
            <div>
              {/* Public Links */}
              <div>
                <h2>Public Links</h2>
                <Link 
                  to="/dynamisk" 
                  className="hover:text-blue-300 transition-colors"
                >
                  Dynamiskt Formulär
                </Link>
                <Link 
                  to="/faq" 
                  className="hover:text-blue-300 transition-colors"
                >
                  FAQ
                </Link>
              </div>

              {/* Admin Links */}
              <div>
                <h2>Admin Pages</h2>
                <Link 
                  to="/admin/login" 
                >
                  Admin Login
                </Link>
                <Link 
                  to="/admin/dashboard" 
                >
                  Dashboard
                </Link>
                <Link 
                  to="/admin/create-user" 
                >
                  Create User
                </Link>
              </div>

              {/* Staff Links */}
              <div>
                <h2>Staff</h2>
                <Link 
                  to="/staff/login"
                >
                  Staff Login
                </Link>
                <Link 
                  to="/staff/dashboard"
                >
                  Dashboard
                </Link>
              </div>

              {/* Chat */}
              <Link 
                to="chat"
              >
                Chat
              </Link>
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