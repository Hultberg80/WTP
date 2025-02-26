import Main from "./Main"

function Header() {
  return (
    <>
      <header className="header-login">
        <nav className="login-nav">
          <h1 className="project-name">WPT</h1>
          <a href="">
            <img src="/img/login.png" alt="Logga in" className="login-img"/>
          </a>
        </nav>
      </header>
      <Main />
    </>
  );
}

export default Header;