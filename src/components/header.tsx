export const Header = ({
  loggedIn,
  accountRegistration,
}: { loggedIn?: boolean; accountRegistration?: boolean }) => {
  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul>
        <li>
          <a href="/history">History</a>
        </li>
        <li>
          <a href="/logoff">Logout</a>
        </li>
      </ul>
    );
  } else {
    rightNav = (
      <ul>
        <li>
          <a href="/login">Login</a>
        </li>
        {accountRegistration && (
          <li>
            <a href="/register">Register</a>
          </li>
        )}
      </ul>
    );
  }

  return (
    <header className="container">
      <nav>
        <ul>
          <li>
            <strong>
              <a
                href="/"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}>
                ConvertX
              </a>
            </strong>
          </li>
        </ul>
        {rightNav}
      </nav>
    </header>
  );
};
