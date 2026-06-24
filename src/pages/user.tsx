import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import { User } from "../db/types";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  HIDE_HISTORY,
  HTTP_ALLOWED,
  WEBROOT,
} from "../helpers/env";

export let FIRST_RUN = db.query("SELECT * FROM users").get() === null || false;

export const userService = new Elysia({ name: "user/service" })
  .use(
    jwt({
      name: "jwt",
      schema: t.Object({
        id: t.String(),
        role: t.String(), // user role in JWT
      }),
      secret: process.env.JWT_SECRET ?? randomUUID(),
      exp: "7d",
    }),
  )
  .model({
    signIn: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    session: t.Cookie({
      auth: t.String(),
      jobId: t.Optional(t.String()),
    }),
    optionalSession: t.Cookie({
      auth: t.Optional(t.String()),
      jobId: t.Optional(t.String()),
    }),
  })
  .macro("auth", {
    cookie: "session",
    async resolve({ status, jwt, cookie: { auth } }) {
      if (!auth.value) {
        return status(401, {
          success: false,
          message: "Unauthorized",
        });
      }
      const user = await jwt.verify(auth.value);
      if (!user) {
        return status(401, {
          success: false,
          message: "Unauthorized",
        });
      }
      return {
        success: true,
        user,
      };
    },
  });

export const user = new Elysia()
  .use(userService)
  .get("/setup", ({ redirect }) => {
    if (!FIRST_RUN) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml title="ConvertX | Setup" webroot={WEBROOT}>
        <main
          class={`
            mx-auto w-full max-w-4xl flex-1 px-2
            sm:px-4
          `}
        >
          <h1 class="my-8 text-3xl">Welcome to ConvertX!</h1>
          <article class="article p-0">
            <header class="w-full bg-neutral-800 p-4">Create your account</header>
            <form method="post" action={`${WEBROOT}/register`} class="p-4">
              <fieldset class="mb-4 flex flex-col gap-4">
                <label class="flex flex-col gap-1">
                  Email
                  <input
                    type="email"
                    name="email"
                    class="rounded-sm bg-neutral-800 p-3"
                    placeholder="Email"
                    autocomplete="email"
                    required
                  />
                </label>
                <label class="flex flex-col gap-1">
                  Password
                  <input
                    type="password"
                    name="password"
                    class="rounded-sm bg-neutral-800 p-3"
                    placeholder="Password"
                    autocomplete="current-password"
                    required
                  />
                </label>
              </fieldset>
              <input type="submit" value="Create account" class="btn-primary" />
            </form>
            <footer class="p-4">
              Report any issues on{" "}
              <a
                class={`
                  text-accent-500 underline
                  hover:text-accent-400
                `}
                href="https://github.com/C4illin/ConvertX"
              >
                GitHub
              </a>
              .
            </footer>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .get("/register", ({ redirect }) => {
    if (!ACCOUNT_REGISTRATION) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Register">
        <>
          <Header
            webroot={WEBROOT}
            accountRegistration={ACCOUNT_REGISTRATION}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            hideHistory={HIDE_HISTORY}
          />
          <main
            class={`
              w-full flex-1 px-2
              sm:px-4
            `}
          >
            <article class="article">
              <form method="post" class="flex flex-col gap-4">
                <fieldset class="mb-4 flex flex-col gap-4">
                  <label class="flex flex-col gap-1">
                    Email
                    <input
                      type="email"
                      name="email"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Email"
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1">
                    Password
                    <input
                      type="password"
                      name="password"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Password"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                </fieldset>
                <input type="submit" value="Register" class="w-full btn-primary" />
              </form>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  })
  .post(
    "/register",
    async ({ body: { email, password }, set, redirect, jwt, cookie: { auth } }) => {
      // first user allowed even if ACCOUNT_REGISTRATION=false
      const isFirstUser = FIRST_RUN;

      if (!ACCOUNT_REGISTRATION && !isFirstUser) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (FIRST_RUN) {
        FIRST_RUN = false;
      }

      const existingUser = await db.query("SELECT * FROM users WHERE email = ?").get(email);
      if (existingUser) {
        set.status = 400;
        return {
          message: "Email already in use.",
        };
      }
      const savedPassword = await Bun.password.hash(password);

      const role = isFirstUser ? "admin" : "user";

      db.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run(
        email,
        savedPassword,
        role,
      );

      const userRow = db.query("SELECT * FROM users WHERE email = ?").as(User).get(email);

      if (!userRow) {
        set.status = 500;
        return {
          message: "Failed to create user.",
        };
      }

      const accessToken = await jwt.sign({
        id: String(userRow.id),
        role: userRow.role,
      });

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: "signIn" },
  )
  .get(
    "/login",
    async ({ jwt, redirect, cookie: { auth } }) => {
      if (FIRST_RUN) {
        return redirect(`${WEBROOT}/setup`, 302);
      }

      // if already logged in, redirect to home
      if (auth?.value) {
        const user = await jwt.verify(auth.value);

        if (user) {
          return redirect(`${WEBROOT}/`, 302);
        }

        auth.remove();
      }

      return (
        <BaseHtml webroot={WEBROOT} title="ConvertX | Login">
          <>
            <Header
              webroot={WEBROOT}
              accountRegistration={ACCOUNT_REGISTRATION}
              allowUnauthenticated={ALLOW_UNAUTHENTICATED}
              hideHistory={HIDE_HISTORY}
            />
            <main
              class={`
                w-full flex-1 px-2
                sm:px-4
              `}
            >
              <article class="article">
                <form method="post" class="flex flex-col gap-4">
                  <fieldset class="mb-4 flex flex-col gap-4">
                    <label class="flex flex-col gap-1">
                      Email
                      <input
                        type="email"
                        name="email"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Email"
                        autocomplete="email"
                        required
                      />
                    </label>
                    <label class="flex flex-col gap-1">
                      Password
                      <input
                        type="password"
                        name="password"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Password"
                        autocomplete="current-password"
                        required
                      />
                    </label>
                  </fieldset>
                  <div class="flex flex-row gap-4">
                    {ACCOUNT_REGISTRATION ? (
                      <a
                        href={`${WEBROOT}/register`}
                        role="button"
                        class="w-full btn-secondary text-center"
                      >
                        Register
                      </a>
                    ) : null}
                    <input type="submit" value="Login" class="w-full btn-primary" />
                  </div>
                </form>
              </article>
            </main>
          </>
        </BaseHtml>
      );
    },
    { body: "signIn", cookie: "optionalSession" },
  )
  .post(
    "/login",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      const existingUser = db.query("SELECT * FROM users WHERE email = ?").as(User).get(body.email);

      if (!existingUser) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);

      if (!validPassword) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const accessToken = await jwt.sign({
        id: String(existingUser.id),
        role: existingUser.role ?? "user",
      });

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: "signIn" },
  )
  .get("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .post("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .get(
    "/account",
    async ({ user, redirect }) => {
      if (!user) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const userData = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);

      if (!userData) {
        return redirect(`${WEBROOT}/`, 302);
      }

      let otherUsers: { id: number; email: string; role: string }[] = [];
      if (userData.role === "admin") {
        otherUsers = db
          .query("SELECT id, email, role FROM users WHERE id != ? ORDER BY email ASC")
          .all(userData.id) as { id: number; email: string; role: string }[];
      }

      return (
        <BaseHtml webroot={WEBROOT} title="ConvertX | Account">
          <>
            <Header
              webroot={WEBROOT}
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
              <article class="article">
                <form method="post" class="flex flex-col gap-4">
                  <fieldset class="mb-4 flex flex-col gap-4">
                    <label class="flex flex-col gap-1">
                      Email
                      <input
                        type="email"
                        name="email"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Email"
                        autocomplete="email"
                        value={userData.email}
                        required
                      />
                    </label>
                    <label class="flex flex-col gap-1">
                      Password (leave blank for unchanged)
                      <input
                        type="password"
                        name="newPassword"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Password"
                        autocomplete="new-password"
                      />
                    </label>
                    <label class="flex flex-col gap-1">
                      Current Password
                      <input
                        type="password"
                        name="password"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Password"
                        autocomplete="current-password"
                        required
                      />
                    </label>
                  </fieldset>
                  <div role="group">
                    <input type="submit" value="Update" class="w-full btn-primary" />
                  </div>
                </form>
              </article>

              {userData.role === "admin" && (
                <>
                  <article class="article mt-6">
                    <header class="mb-4">
                      <h2 class="text-xl font-semibold">Add new user</h2>
                      <p class="text-sm text-neutral-400">
                        Create additional users for this ConvertX instance. Admins can create other
                        admins or normal users.
                      </p>
                    </header>
                    <form
                      method="post"
                      action={`${WEBROOT}/account/add-user`}
                      class="flex flex-col gap-4"
                    >
                      <fieldset class="mb-4 flex flex-col gap-4">
                        <label class="flex flex-col gap-1">
                          Email
                          <input
                            type="email"
                            name="newUserEmail"
                            class="rounded-sm bg-neutral-800 p-3"
                            placeholder="Email"
                            autocomplete="email"
                            required
                          />
                        </label>
                        <label class="flex flex-col gap-1">
                          Password
                          <input
                            type="password"
                            name="newUserPassword"
                            class="rounded-sm bg-neutral-800 p-3"
                            placeholder="Password"
                            autocomplete="new-password"
                            required
                          />
                        </label>
                        <label class="flex flex-col gap-1">
                          Role
                          <select name="newUserRole" class="rounded-sm bg-neutral-800 p-3" required>
                            <option value="user">Normal user</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                      </fieldset>
                      <div role="group">
                        <input type="submit" value="Add user" class="w-full btn-secondary" />
                      </div>
                    </form>
                  </article>

                  {otherUsers.length > 0 && (
                    <article class="article mt-6">
                      <header class="mb-4">
                        <h2 class="text-xl font-semibold">Manage users</h2>
                        <p class="text-sm text-neutral-400">
                          Edit or delete users from this instance. You cannot delete yourself or the
                          last remaining admin.
                        </p>
                      </header>
                      <div class="scrollbar-thin max-h-[50vh] overflow-y-auto">
                        <table
                          class={`
                            w-full table-auto rounded bg-neutral-900
                            [&_td]:border-b [&_td]:border-neutral-800 [&_td]:p-2
                            [&_th]:border-b [&_th]:border-neutral-800 [&_th]:p-2
                          `}
                        >
                          <thead>
                            <tr>
                              <th class="text-left">Email</th>
                              <th class="text-left">Role</th>
                              <th class="text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {otherUsers.map((u) => (
                              <tr>
                                <td>{u.email}</td>
                                <td class="capitalize">{u.role}</td>
                                <td>
                                  <div class="flex items-center gap-6">
                                    {/* Edit / details icon */}
                                    <form method="get" action={`${WEBROOT}/account/edit-user`}>
                                      <input type="hidden" name="userId" value={String(u.id)} />
                                      <button
                                        type="submit"
                                        class={`
                                          inline-flex items-center justify-center text-accent-400
                                          hover:text-accent-500
                                        `}
                                        title="Edit user"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          class="h-6 w-6"
                                          fill="none"
                                          stroke="currentColor"
                                          stroke-width="1.8"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                        >
                                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                      </button>
                                    </form>

                                    {/* Delete icon */}
                                    <form
                                      method="post"
                                      action={`${WEBROOT}/account/delete-user`}
                                      onsubmit="return confirm('Are you sure you want to delete this user?');"
                                    >
                                      <input
                                        type="hidden"
                                        name="deleteUserId"
                                        value={String(u.id)}
                                      />
                                      <button
                                        type="submit"
                                        class={`
                                          inline-flex items-center justify-center text-accent-400
                                          hover:text-accent-500
                                        `}
                                        title="Delete user"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          class="h-6 w-6"
                                          fill="none"
                                          stroke="currentColor"
                                          stroke-width="1.8"
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                        >
                                          <path d="M4 7h16" />
                                          <path d="M10 11v6" />
                                          <path d="M14 11v6" />
                                          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                                          <path d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                                        </svg>
                                      </button>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  )}
                </>
              )}
            </main>
          </>
        </BaseHtml>
      );
    },
    {
      auth: true,
    },
  )
  .post(
    "/account",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const tokenUser = await jwt.verify(auth.value);
      if (!tokenUser) {
        return redirect(`${WEBROOT}/login`, 302);
      }
      const existingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(tokenUser.id);

      if (!existingUser) {
        if (auth?.value) {
          auth.remove();
        }
        return redirect(`${WEBROOT}/login`, 302);
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);

      if (!validPassword) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const fields: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values: any[] = [];

      if (body.email) {
        const existingUserWithEmail = await db
          .query("SELECT id FROM users WHERE email = ?")
          .as(User)
          .get(body.email);
        if (existingUserWithEmail && existingUserWithEmail.id.toString() !== tokenUser.id) {
          set.status = 409;
          return { message: "Email already in use." };
        }
        fields.push("email");
        values.push(body.email);
      }
      if (body.newPassword) {
        fields.push("password");
        values.push(await Bun.password.hash(body.newPassword));
      }

      if (fields.length > 0) {
        db.query(
          `UPDATE users SET ${fields.map((field) => `${field}=?`).join(", ")} WHERE id=?`,
        ).run(...values, tokenUser.id);
      }

      return redirect(`${WEBROOT}/`, 302);
    },
    {
      body: t.Object({
        email: t.MaybeEmpty(t.String()),
        newPassword: t.MaybeEmpty(t.String()),
        password: t.String(),
      }),
      cookie: "session",
    },
  )
  .post(
    "/account/add-user",
    async ({ body, set, redirect, jwt, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const tokenUser = await jwt.verify(auth.value);
      if (!tokenUser) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const actingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(tokenUser.id);

      if (!actingUser) {
        if (auth?.value) {
          auth.remove();
        }
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (actingUser.role !== "admin") {
        set.status = 403;
        return {
          message: "Only admins can create new users.",
        };
      }

      const { newUserEmail, newUserPassword, newUserRole } = body as {
        newUserEmail: string;
        newUserPassword: string;
        newUserRole: string;
      };

      if (!newUserEmail || !newUserPassword) {
        set.status = 400;
        return {
          message: "Missing email or password.",
        };
      }

      const existingNewUser = db.query("SELECT id FROM users WHERE email = ?").get(newUserEmail);
      if (existingNewUser) {
        set.status = 400;
        return {
          message: "A user with this email already exists.",
        };
      }

      const hashedPassword = await Bun.password.hash(newUserPassword);
      const role = newUserRole === "admin" ? "admin" : "user";

      db.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run(
        newUserEmail,
        hashedPassword,
        role,
      );

      return redirect(`${WEBROOT}/account`, 302);
    },
    {
      body: t.Object({
        newUserEmail: t.String(),
        newUserPassword: t.String(),
        newUserRole: t.String(),
      }),
      cookie: "session",
    },
  )
  .get(
    "/account/edit-user",
    async ({ query, user, redirect }) => {
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const actingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);
      if (!actingUser || actingUser.role !== "admin") {
        return redirect(`${WEBROOT}/account`, 302);
      }

      const targetId = Number.parseInt(query.userId, 10);
      if (!Number.isFinite(targetId) || targetId === actingUser.id) {
        return redirect(`${WEBROOT}/account`, 302);
      }

      const targetUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(targetId);
      if (!targetUser) {
        return redirect(`${WEBROOT}/account`, 302);
      }

      return (
        <BaseHtml webroot={WEBROOT} title="ConvertX | Edit user">
          <>
            <Header
              webroot={WEBROOT}
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
              <article class="article">
                <header class="mb-4">
                  <h1 class="text-xl font-semibold">Edit user</h1>
                  <p class="text-sm text-neutral-400">
                    Change this user&apos;s role or set a new password. Leave password blank to keep
                    it unchanged.
                  </p>
                </header>
                <form
                  method="post"
                  action={`${WEBROOT}/account/edit-user`}
                  class={`
                    flex flex-col gap-4
                  `}
                >
                  <input type="hidden" name="userId" value={String(targetUser.id)} />
                  <fieldset class="mb-4 flex flex-col gap-4">
                    <label class="flex flex-col gap-1">
                      Email
                      <input
                        type="email"
                        value={targetUser.email}
                        class="rounded-sm bg-neutral-800 p-3"
                        disabled
                      />
                    </label>
                    <label class="flex flex-col gap-1">
                      Role
                      <select name="role" class="rounded-sm bg-neutral-800 p-3 capitalize" required>
                        <option value="user" selected={targetUser.role === "user"}>
                          Normal user
                        </option>
                        <option value="admin" selected={targetUser.role === "admin"}>
                          Admin
                        </option>
                      </select>
                    </label>
                    <label class="flex flex-col gap-1">
                      New password (optional)
                      <input
                        type="password"
                        name="newPassword"
                        class="rounded-sm bg-neutral-800 p-3"
                        placeholder="Leave blank to keep current password"
                        autocomplete="new-password"
                      />
                    </label>
                  </fieldset>
                  <div class="flex flex-row gap-4">
                    <a href={`${WEBROOT}/account`} class="w-full btn-secondary text-center">
                      Cancel
                    </a>
                    <button type="submit" class="w-full btn-primary">
                      Save changes
                    </button>
                  </div>
                </form>
              </article>
            </main>
          </>
        </BaseHtml>
      );
    },
    {
      auth: true,
      query: t.Object({
        userId: t.String(),
      }),
    },
  )
  .post(
    "/account/edit-user",
    async ({ body, set, redirect, jwt, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const tokenUser = await jwt.verify(auth.value);
      if (!tokenUser) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const actingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(tokenUser.id);
      if (!actingUser || actingUser.role !== "admin") {
        set.status = 403;
        return { message: "Only admins can edit users." };
      }

      const { userId, role, newPassword } = body as {
        userId: string;
        role: string;
        newPassword?: string;
      };

      const targetId = Number.parseInt(userId, 10);
      if (!Number.isFinite(targetId) || targetId === actingUser.id) {
        return redirect(`${WEBROOT}/account`, 302);
      }

      const targetUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(targetId);
      if (!targetUser) {
        return redirect(`${WEBROOT}/account`, 302);
      }

      // IMPORTANT: do not hold a SQLite write transaction open across an `await`.
      // Hash any password outside the transaction to avoid lock contention.
      let hashedPassword: string | null = null;
      if (newPassword && newPassword.trim().length > 0) {
        hashedPassword = await Bun.password.hash(newPassword);
      }

      // Atomic last-admin protection: concurrent demotions must not be able to leave zero admins.
      // Serialize writers and make demotion conditional in a single statement.
      db.exec("BEGIN IMMEDIATE");
      try {
        // Role change
        if (role === "admin") {
          db.query("UPDATE users SET role = 'admin' WHERE id = ?").run(targetId);
        } else if (role === "user") {
          const demoteRes = db
            .query(
              `UPDATE users
         SET role = 'user'
         WHERE id = ?
           AND role = 'admin'
           AND (SELECT COUNT(*) FROM users WHERE role = 'admin') > 1`,
            )
            .run(targetId);

          if (targetUser.role === "admin" && demoteRes.changes === 0) {
            db.exec("ROLLBACK");
            set.status = 400;
            return { message: "You cannot demote the last remaining admin." };
          }
        }

        // Password change (optional)
        if (hashedPassword) {
          db.query("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, targetId);
        }

        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch (rollbackErr) {
          console.warn("[user/edit-user] ROLLBACK failed:", rollbackErr);
        }
        throw e;
      }

      return redirect(`${WEBROOT}/account`, 302);
    },
    {
      body: t.Object({
        userId: t.String(),
        role: t.String(),
        newPassword: t.MaybeEmpty(t.String()),
      }),
      cookie: "session",
    },
  )
  .post(
    "/account/delete-user",
    async ({ body, set, redirect, jwt, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const tokenUser = await jwt.verify(auth.value);
      if (!tokenUser) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const actingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(tokenUser.id);

      if (!actingUser) {
        if (auth?.value) {
          auth.remove();
        }
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (actingUser.role !== "admin") {
        set.status = 403;
        return { message: "Only admins can delete users." };
      }

      const { deleteUserId } = body as { deleteUserId: string };
      const targetId = Number.parseInt(deleteUserId, 10);

      if (!Number.isFinite(targetId)) {
        set.status = 400;
        return { message: "Invalid user id." };
      }

      if (targetId === actingUser.id) {
        set.status = 400;
        return { message: "You cannot delete your own account from here." };
      }

      const targetUser = db
        .query("SELECT * FROM users WHERE id = ?")
        .as(User)
        .get(targetId as unknown as number);

      if (!targetUser) {
        return redirect(`${WEBROOT}/account`, 302);
      }

      if (targetUser.role === "admin") {
        const adminCountRow = db
          .query("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'")
          .get() as { cnt: number };
        if (adminCountRow.cnt <= 1) {
          set.status = 400;
          return { message: "You cannot delete the last remaining admin." };
        }
      }

      // delete this user's jobs and files (to avoid FK issues) in a single transaction
      const deleteUserTx = db.transaction((id: number) => {
        db.query(
          "DELETE FROM file_names WHERE job_id IN (SELECT id FROM jobs WHERE user_id = ?)",
        ).run(id);
        db.query("DELETE FROM jobs WHERE user_id = ?").run(id);
        db.query("DELETE FROM users WHERE id = ?").run(id);
      });

      deleteUserTx(targetId);

      return redirect(`${WEBROOT}/account`, 302);
    },
    {
      body: t.Object({
        deleteUserId: t.String(),
      }),
      cookie: "session",
    },
  );
