import { randomInt } from "node:crypto";
import { JWTPayloadSpec } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import { getAllTargets } from "../converters/main";
import db from "../db/db";
import { User } from "../db/types";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  HIDE_HISTORY,
  HTTP_ALLOWED,
  UNAUTHENTICATED_USER_SHARING,
  WEBROOT,
} from "../helpers/env";
import { FIRST_RUN, userService } from "./user";

export const root = new Elysia().use(userService).get(
  "/",
  async ({ jwt, redirect, cookie: { auth, jobId } }) => {
    if (!ALLOW_UNAUTHENTICATED) {
      if (FIRST_RUN) {
        return redirect(`${WEBROOT}/setup`, 302);
      }

      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }
    }

    // validate jwt
    let user: ({ id: string } & JWTPayloadSpec) | false = false;
    if (ALLOW_UNAUTHENTICATED) {
      const newUserId = String(
        UNAUTHENTICATED_USER_SHARING
          ? 0
          : randomInt(2 ** 24, Math.min(2 ** 48 + 2 ** 24 - 1, Number.MAX_SAFE_INTEGER)),
      );
      const accessToken = await jwt.sign({
        id: newUserId,
      });

      user = { id: newUserId };
      if (!auth) {
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 24 * 60 * 60,
        sameSite: "strict",
      });
    } else if (auth?.value) {
      user = await jwt.verify(auth.value);

      if (
        user !== false &&
        user.id &&
        (Number.parseInt(user.id) < 2 ** 24 || !ALLOW_UNAUTHENTICATED)
      ) {
        // Make sure user exists in db
        const existingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);

        if (!existingUser) {
          if (auth?.value) {
            auth.remove();
          }
          return redirect(`${WEBROOT}/login`, 302);
        }
      }
    }

    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    // create a new job
    db.query("INSERT INTO jobs (user_id, date_created) VALUES (?, ?)").run(
      user.id,
      new Date().toISOString(),
    );

    const { id } = db
      .query("SELECT id FROM jobs WHERE user_id = ? ORDER BY id DESC")
      .get(user.id) as { id: number };

    if (!jobId) {
      return { message: "Cookies should be enabled to use this app." };
    }

    jobId.set({
      value: id,
      httpOnly: true,
      secure: !HTTP_ALLOWED,
      maxAge: 24 * 60 * 60,
      sameSite: "strict",
    });

    console.log("jobId set to:", id);

    return (
      <BaseHtml webroot={WEBROOT}>
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
              <h1 class="mb-4 text-xl">Convert</h1>
              <div class="mb-4 scrollbar-thin max-h-[50vh] overflow-y-auto">
                <table
                  id="file-list"
                  class={`
                    w-full table-auto rounded bg-neutral-900
                    [&_td]:p-4 [&_td]:first:max-w-[30vw] [&_td]:first:truncate
                    [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                  `}
                />
              </div>
              <div
                id="dropzone"
                class={`
                  relative flex h-48 w-full items-center justify-center rounded border border-dashed
                  border-neutral-700 transition-all
                  hover:border-neutral-600
                  [&.dragover]:border-4 [&.dragover]:border-neutral-500
                `}
              >
                <span>
                  <b>Choose a file</b> or drag it here
                </span>
                <input
                  type="file"
                  name="file"
                  multiple
                  class="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </div>
            </article>
            <form
              method="post"
              action={`${WEBROOT}/convert`}
              class="relative mx-auto mb-[35vh] w-full max-w-4xl"
            >
              <input type="hidden" name="file_names" id="file_names" />
              <article class="article w-full">
                <input
                  type="search"
                  name="convert_to_search"
                  placeholder="Search for conversions"
                  autocomplete="off"
                  class="w-full rounded-sm bg-neutral-800 p-4"
                />
                <div class="select_container relative">
                  <article
                    class={`
                      convert_to_popup absolute z-2 m-0 hidden h-[30vh] max-h-[50vh] w-full flex-col
                      overflow-x-hidden overflow-y-auto rounded bg-neutral-800
                      sm:h-[30vh]
                    `}
                  >
                    {Object.entries(getAllTargets()).map(([converter, targets]) => (
                      <article
                        class={`
                          convert_to_group flex w-full flex-col border-b border-neutral-700 p-4
                        `}
                        data-converter={converter}
                      >
                        <header class="mb-2 w-full text-xl font-bold" safe>
                          {converter}
                        </header>
                        <ul class={`convert_to_target flex flex-row flex-wrap gap-1`}>
                          {targets.map((target) => (
                            <button
                              // https://stackoverflow.com/questions/121499/when-a-blur-event-occurs-how-can-i-find-out-which-element-focus-went-to#comment82388679_33325953
                              tabindex={0}
                              class={`
                                target rounded bg-neutral-700 p-1 text-base
                                hover:bg-neutral-600
                              `}
                              data-value={`${target},${converter}`}
                              data-target={target}
                              data-converter={converter}
                              type="button"
                              safe
                            >
                              {target}
                            </button>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </article>

                  {/* Hidden element which determines the format to convert the file too and the converter to use */}
                  <select name="convert_to" aria-label="Convert to" required hidden>
                    <option selected disabled value="">
                      Convert to
                    </option>
                    {Object.entries(getAllTargets()).map(([converter, targets]) => (
                      <optgroup label={converter}>
                        {targets.map((target) => (
                          <option value={`${target},${converter}`} safe>
                            {target}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </article>
              <input
                class={`
                  w-full btn-primary opacity-100
                  disabled:cursor-not-allowed disabled:opacity-50
                `}
                type="submit"
                value="Convert"
                disabled
              />
            </form>
          </main>
          <script src="script.js" defer />
        </>
      </BaseHtml>
    );
  },
  {
    cookie: t.Cookie({
      auth: t.Optional(t.String()),
      jobId: t.Optional(t.String()),
    }),
  },
);
