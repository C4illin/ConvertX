export const Header = ({
  loggedIn,
  accountRegistration,
}: { loggedIn?: boolean; accountRegistration?: boolean }) => {
  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul class="flex gap-4 ">
        <li>
          <a
            class="text-accent-600 transition-all hover:text-accent-500 hover:underline"
            href="/history">
            History
          </a>
        </li>
        <li>
          <a
            class="text-accent-600 transition-all hover:text-accent-500 hover:underline"
            href="/logoff">
            Logout
          </a>
        </li>
      </ul>
    );
  } else {
    rightNav = (
      <ul class="flex gap-4">
        <li>
          <a
            class="text-accent-600 transition-all hover:text-accent-500 hover:underline"
            href="/login">
            Login
          </a>
        </li>
        {accountRegistration ? (
          <li>
            <a
              class="text-accent-600 transition-all hover:text-accent-500 hover:underline"
              href="/register">
              Register
            </a>
          </li>
        ) : null}
      </ul>
    );
  }

  return (
    <header class="w-full p-4">
      <nav class="mx-auto flex max-w-4xl justify-between rounded bg-neutral-900 p-4">
        <ul>
          <li>
            <strong>
              <a href="/">ConvertX</a>
            </strong>
          </li>
        </ul>
        {rightNav}
      </nav>
    </header>
  );
};
