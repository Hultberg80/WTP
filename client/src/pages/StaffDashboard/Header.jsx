import Aside from "./Aside"
import Main from "./Main"

function Header(){

  return<>
  <header className="header-login">
      <nav className="login-nav">
        <h1 className="project-name">WPT</h1>
        <a href="/staff/login">
        <img src="/img/login.png" alt="Logga in" className="login-img" />
          </a>
      </nav>
  </header>
    <Aside />
    <Main />
  </>
}

export default Header 