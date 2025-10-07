import Elysia, { t } from "elysia";
import { getPossibleTargets } from "../converters/main";
import { userService } from "./user";

export const chooseConverter = new Elysia().use(userService).post(
  "/conversions",
  ({ body }) => {
    return (
      <>
        <article
          class={`
            convert_to_popup absolute z-2 m-0 hidden h-[50vh] max-h-[50vh] w-full flex-col
            overflow-x-hidden overflow-y-auto rounded bg-neutral-800
            sm:h-[30vh]
          `}
        >
          {Object.entries(getPossibleTargets(body.fileType)).map(([converter, targets]) => (
            <article
              class={`convert_to_group flex w-full flex-col border-b border-neutral-700 p-4`}
              data-converter={converter}
            >
              <header class="mb-2 w-full text-xl font-bold" safe>
                {converter}
              </header>
              <ul class="convert_to_target flex flex-row flex-wrap gap-1">
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

        <select name="convert_to" aria-label="Convert to" required hidden>
          <option selected disabled value="">
            Convert to
          </option>
          {Object.entries(getPossibleTargets(body.fileType)).map(([converter, targets]) => (
            <optgroup label={converter}>
              {targets.map((target) => (
                <option value={`${target},${converter}`} safe>
                  {target}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </>
    );
  },
  { body: t.Object({ fileType: t.String() }) },
);
