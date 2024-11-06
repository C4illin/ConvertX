import { Html } from "@kitajs/html";

export const Header = ({
  loggedIn,
  accountRegistration,
  webroot = "",
}: {
  loggedIn?: boolean;
  accountRegistration?: boolean;
  webroot?: string;
}) => {
  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul class="flex gap-4">
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
      </ul>
    );
  } else {
    rightNav = (
      <ul class="flex gap-4">
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
      <nav class="mx-auto flex max-w-4xl justify-between rounded bg-neutral-900 p-4">
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
