import { Elysia, t } from "elysia";

import { type ApiKey, createApiKey, deleteApiKey, listApiKeys } from "../api/keys";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  BRANDING,
  HIDE_HISTORY,
  LANGUAGE,
  TIMEZONE,
  WEBROOT,
} from "../helpers/env";
import { userService } from "../services/user";

/** Dates in the configured language and time zone, like the history page. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(LANGUAGE, { timeZone: TIMEZONE });
}

function ApiKeysPage({ keys, created }: { keys: ApiKey[]; created?: string | undefined }) {
  return (
    <BaseHtml webroot={WEBROOT} title={`${BRANDING} | API keys`}>
      <>
        <Header
          webroot={WEBROOT}
          branding={BRANDING}
          accountRegistration={ACCOUNT_REGISTRATION}
          allowUnauthenticated={ALLOW_UNAUTHENTICATED}
          hideHistory={HIDE_HISTORY}
          loggedIn
        />
        <main
          class={`
            w-full flex-1 px-2
            sm:px-4
          `}
        >
          <article class="article flex flex-col gap-4">
            <h1 class="text-xl">API keys</h1>
            <p>
              Keys let scripts and tools convert files through the ConvertX API. Send one as{" "}
              {/* Escaped by hand: JSX would turn &lt; in markup back into a raw "<". */}
              <code>{"Authorization: Bearer &lt;key&gt;"}</code>. See the{" "}
              <a href={`${WEBROOT}/api/v1/docs`} class="underline">
                API documentation
              </a>
              .
            </p>
            {created ? (
              <div class="flex flex-col gap-2 rounded-sm bg-neutral-800 p-3" role="status">
                <strong>Copy your new key now. It won't be shown again.</strong>
                <code class="break-all select-all" safe>
                  {created}
                </code>
              </div>
            ) : null}
            <form method="post" action={`${WEBROOT}/account/api-keys`} class="flex flex-col gap-1">
              <label for="api-key-name">What's this key for?</label>
              {/* Its own row, so the input and the button stretch to the same height. */}
              <div class="flex flex-row gap-2">
                <input
                  type="text"
                  id="api-key-name"
                  name="name"
                  list="api-key-uses"
                  class="min-w-0 flex-1 rounded-sm bg-neutral-800 p-3"
                  placeholder="Pick a suggestion or type your own"
                  maxlength="100"
                  required
                />
                <input type="submit" value="Create key" class="btn-primary" />
              </div>
              {/* Suggestions only: any name works, and the name doesn't change what a key can do. */}
              <datalist id="api-key-uses">
                <option value="n8n" />
                <option value="Node-RED" />
                <option value="Home Assistant" />
                <option value="Script" />
                <option value="Command line" />
              </datalist>
            </form>
            {keys.length === 0 ? (
              <p>You have no API keys yet.</p>
            ) : (
              // Scrolls sideways on phones instead of widening the page.
              <div class="overflow-x-auto">
                <table class="w-full table-auto text-left">
                  <thead>
                    <tr>
                      <th class="px-2 py-1">Name</th>
                      <th class="px-2 py-1">Key</th>
                      <th class="px-2 py-1">Created</th>
                      <th class="px-2 py-1">Last used</th>
                      <th class="px-2 py-1">
                        <span class="sr-only">Revoke</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr>
                        <td class="px-2 py-1" safe>
                          {key.name}
                        </td>
                        <td class="px-2 py-1">
                          <code safe>{`${key.prefix}…`}</code>
                        </td>
                        <td class="px-2 py-1" safe>
                          {formatDate(key.date_created)}
                        </td>
                        <td class="px-2 py-1">
                          {key.last_used ? formatDate(key.last_used) : "Never"}
                        </td>
                        <td class="px-2 py-1">
                          <form
                            method="post"
                            action={`${WEBROOT}/account/api-keys/${key.id}/delete`}
                          >
                            <input type="submit" value="Revoke" class="btn-secondary" />
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </main>
      </>
    </BaseHtml>
  );
}

/** Keys belong to accounts, so anonymous sessions (`ALLOW_UNAUTHENTICATED`) can't manage any. */
function isRegistered(userId: string): boolean {
  return db.query("SELECT 1 FROM users WHERE id = ?").get(userId) !== null;
}

// Creating a key redirects to the keys page, which shows the new key once. Reloading that page
// can't create another key. Until it's shown, the key waits here for at most a minute.
const newKeys = new Map<string, { key: string; expires: number }>();

function takeNewKey(userId: string): string | undefined {
  const entry = newKeys.get(userId);
  newKeys.delete(userId);
  return entry && entry.expires > Date.now() ? entry.key : undefined;
}

export const apiKeys = new Elysia()
  .use(userService)
  .get(
    "/account/api-keys",
    ({ user, redirect }) => {
      if (!isRegistered(user.id)) return redirect(`${WEBROOT}/`, 302);
      return <ApiKeysPage keys={listApiKeys(user.id)} created={takeNewKey(user.id)} />;
    },
    { auth: true },
  )
  .post(
    "/account/api-keys",
    ({ body, user, redirect }) => {
      if (!isRegistered(user.id)) return redirect(`${WEBROOT}/`, 302);
      const { key } = createApiKey(user.id, body.name.slice(0, 100));
      const now = Date.now();
      for (const [id, entry] of newKeys) if (entry.expires <= now) newKeys.delete(id);
      newKeys.set(user.id, { key, expires: now + 60_000 });
      return redirect(`${WEBROOT}/account/api-keys`, 303);
    },
    { auth: true, body: t.Object({ name: t.String() }) },
  )
  // A POST, not a GET, so a link can't revoke a key behind the user's back.
  .post(
    "/account/api-keys/:id/delete",
    ({ params, user, redirect }) => {
      if (isRegistered(user.id)) deleteApiKey(user.id, params.id);
      return redirect(`${WEBROOT}/account/api-keys`, 302);
    },
    { auth: true, params: t.Object({ id: t.Numeric() }) },
  );
