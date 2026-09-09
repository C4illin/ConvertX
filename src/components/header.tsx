export const Header = ({
  loggedIn,
  accountRegistration,
  allowUnauthenticated,
  hideHistory,
  webroot = "",
}: {
  loggedIn?: boolean;
  accountRegistration?: boolean;
  allowUnauthenticated?: boolean;
  hideHistory?: boolean;
  webroot?: string;
}) => {
  const themeToggle = (
    <li class="flex items-center gap-2">
      <span id="cx-theme-label" class="text-sm font-medium text-neutral-200">
        Dark
      </span>
      <label class="relative inline-flex cursor-pointer items-center" title="Toggle theme">
        <input
          id="cx-theme-switch"
          type="checkbox"
          class="sr-only peer"
          aria-label="Toggle dark mode"
        />
        <div
          class={
            `
              relative h-6 w-11 rounded-full bg-neutral-700
              transition-colors
              peer-checked:bg-blue-600
              peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-neutral-500 after:shadow-sm after:transition-transform
              peer-checked:after:translate-x-5
            `
          }
        />
      </label>
    </li>
  );

  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul class="flex items-center gap-6">
        {themeToggle}
        {!hideHistory && (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/history`}
            >
              History
            </a>
          </li>
        )}
        {!allowUnauthenticated ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/account`}
            >
              Account
            </a>
          </li>
        ) : null}
        {!allowUnauthenticated ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/logoff`}
            >
              Logout
            </a>
          </li>
        ) : null}
      </ul>
    );
  } else {
    rightNav = (
      <ul class="flex items-center gap-6">
        {themeToggle}
        <li>
          <a
            class={`
              text-accent-600 transition-all
              hover:text-accent-500 hover:underline
            `}
            href={`${webroot}/login`}
          >
            Login
          </a>
        </li>
        {accountRegistration ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/register`}
            >
              Register
            </a>
          </li>
        ) : null}
      </ul>
    );
  }

  return (
    <header class="w-full p-4">
      <nav class={`mx-auto flex max-w-4xl justify-between rounded-sm bg-neutral-900 p-4`}>
        <ul>
          <li>
            <strong>
              <a href={`${webroot}/`}>ConvertX</a>
            </strong>
          </li>
        </ul>
        {rightNav}
      </nav>
    </header>
  );
};
