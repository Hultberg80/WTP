
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context";
import Main from "./Main";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  return (
    <>
      <header className="header-login">
        <nav className="login-nav">
          <h1 className="project-name">WPT</h1>
          <div className="flex items-center">
            {user && (
              <span className="mr-4">{user}</span>
            )}
            <button onClick={handleLogout}>
              <img src="/img/login.png" alt="Logga ut" className="login-img"/>
            </button>
          </div>
        </nav>
      </header>
      <Main />
    </>
  );
}

export default Header;