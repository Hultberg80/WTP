import { NavLink, Outlet } from 'react-router-dom'; // Ta bort useNavigate eftersom det inte används
import { useEffect } from 'react'; // Ta bort useState eftersom det inte används
import { useChat, useForm, useTickets } from './context';

function Layout() {
  // Ta bort navigate eftersom det inte används
  const { unreadMessages, fetchChatData } = useChat();
  const { pendingForms, fetchPendingForms } = useForm();
  const { pendingTickets, fetchTickets } = useTickets();
  // Ställ in automatisk uppdatering av data
  useEffect(() => {
    // Hämta data direkt när komponenten laddas
    console.log('Initial data fetch');
    fetchChatData && fetchChatData();
    fetchPendingForms && fetchPendingForms();
    fetchTickets && fetchTickets();

    // Sätt upp intervall för automatisk uppdatering
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing data...');
      fetchChatData && fetchChatData();
      fetchPendingForms && fetchPendingForms();
      fetchTickets && fetchTickets();
    }, 10000); // Uppdatera varje 10 sekund

    // Rensa intervall när komponenten avmonteras
    return () => clearInterval(intervalId);
  }, [fetchChatData, fetchPendingForms, fetchTickets]);

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
                  {pendingTickets > 0 && (
                    <span className="notification-badge">{pendingTickets}</span>
                  )}
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
                  {pendingForms > 0 && (
                    <span className="notification-badge">{pendingForms}</span>
                  )}
                </NavLink>
              </div>

              {/* Chat med notifikation för olästa meddelanden */}
              <NavLink 
                to={"chat"}
              >
                Chat
                {unreadMessages > 0 && (
                  <span className="notification-badge">{unreadMessages}</span>
                )}
              </NavLink>
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
          <p>&copy; {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
export default Layout;