import Elysia from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import { getAllInputs, getAllTargets } from "../converters/main";
import { ALLOW_UNAUTHENTICATED, WEBROOT } from "../helpers/env";
import { userService } from "./user";

export const listConverters = new Elysia().use(userService).get(
  "/converters",
  async () => {
    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Converters">
        <>
          <Header webroot={WEBROOT} allowUnauthenticated={ALLOW_UNAUTHENTICATED} loggedIn />
          <main
            class={`
              w-full flex-1 px-2
              sm:px-4
            `}
          >
            <article class="article">
              <h1 class="mb-4 text-xl">Converters</h1>
              <table
                class={`
                  w-full table-auto rounded bg-neutral-900 text-left
                  [&_td]:p-4
                  [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                  [&_ul]:list-inside [&_ul]:list-disc
                `}
              >
                <thead>
                  <tr>
                    <th class="mx-4 my-2">Converter</th>
                    <th class="mx-4 my-2">From (Count)</th>
                    <th class="mx-4 my-2">To (Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(getAllTargets()).map(([converter, targets]) => {
                    const inputs = getAllInputs(converter);
                    return (
                      <tr>
                        <td safe>{converter}</td>
                        <td>
                          Count: {inputs.length}
                          <ul>
                            {inputs.map((input) => (
                              <li safe>{input}</li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          Count: {targets.length}
                          <ul>
                            {targets.map((target) => (
                              <li safe>{target}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  },
  {
    auth: true,
  },
);
