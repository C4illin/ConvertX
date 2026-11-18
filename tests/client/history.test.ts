import { afterEach, describe, expect, test } from "bun:test";

import { type ClientEnv, setupClient } from "./dom";

let env: ClientEnv;
afterEach(() => env.teardown());

const page = `
  <button id="delete-selected-btn" disabled>Delete (<span id="selected-count">0</span>)</button>
  <input type="checkbox" id="select-all" />
  <table>
    <tr><td><input type="checkbox" data-checkbox-type="job" data-job-id="1" /></td>
        <td class="job-details-toggle" data-job-id="1"><svg id="arrow-1"><path d="M8.25 4.5" /></svg></td></tr>
    <tr id="details-1" class="hidden"><td>details</td></tr>
    <tr><td><input type="checkbox" data-checkbox-type="job" data-job-id="2" /></td>
        <td class="job-details-toggle" data-job-id="2"><svg id="arrow-2"></svg></td></tr>
    <tr id="details-2" class="hidden"><td>details</td></tr>
  </table>`;

const boxes = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>("[data-job-id][type=checkbox]"));
const change = (el: HTMLInputElement, checked: boolean) => {
  el.checked = checked;
  el.dispatchEvent(new Event("change"));
};
const deleteBtn = () => document.getElementById("delete-selected-btn") as HTMLButtonElement;

describe("history.ts", () => {
  test("toggles details rows and the arrow", async () => {
    env = setupClient(page);
    await env.load("history.ts");

    const toggle = document.querySelector<HTMLElement>(".job-details-toggle")!;
    toggle.click();
    expect(document.getElementById("details-1")!.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("arrow-1")!.innerHTML).toContain("M19.5 8.25");

    toggle.click();
    expect(document.getElementById("details-1")!.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("arrow-1")!.innerHTML).toContain("M8.25 4.5");
  });

  test("enables the delete button and counts the selected jobs", async () => {
    env = setupClient(page);
    await env.load("history.ts");

    change(boxes()[0]!, true);
    expect(deleteBtn().disabled).toBe(false);
    expect(document.getElementById("selected-count")!.textContent).toBe("1");

    change(boxes()[0]!, false);
    expect(deleteBtn().disabled).toBe(true);
    expect(document.getElementById("selected-count")!.textContent).toBe("0");
  });

  test("select-all and the individual boxes stay in sync", async () => {
    env = setupClient(page);
    await env.load("history.ts");
    const all = document.getElementById("select-all") as HTMLInputElement;

    change(all, true);
    expect(boxes().every((b) => b.checked)).toBe(true);
    expect(document.getElementById("selected-count")!.textContent).toBe("2");

    change(boxes()[0]!, false);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
  });

  describe("bulk delete", () => {
    const run = async (confirmed: boolean) => {
      const alerts: string[] = [];
      const reloads: number[] = [];
      globalThis.confirm = () => confirmed;
      globalThis.alert = (m?: string) => void alerts.push(String(m));
      Object.defineProperty(window.location, "reload", { value: () => reloads.push(1) });
      await env.load("history.ts");
      change(boxes()[0]!, true);
      change(boxes()[1]!, true);
      deleteBtn().click();
      await Bun.sleep(10);
      return { alerts, reloads };
    };

    test("posts the selected job ids and reloads on success", async () => {
      env = setupClient(page);
      env.respondWith({ success: true, deleted: 2, failed: 0, details: {} });
      const { alerts, reloads } = await run(true);

      expect(env.fetchCalls).toHaveLength(1);
      expect(env.fetchCalls[0]!.url).toEndWith("/delete-multiple");
      expect(JSON.parse(env.fetchCalls[0]!.body!)).toEqual({ jobIds: ["1", "2"] });
      expect(alerts).toEqual(["Successfully deleted 2 job(s)."]);
      expect(reloads).toHaveLength(1);
    });

    test("does nothing when the confirmation is declined", async () => {
      env = setupClient(page);
      const { alerts } = await run(false);

      expect(env.fetchCalls).toEqual([]);
      expect(alerts).toEqual([]);
    });

    test("alerts without reloading when the request fails", async () => {
      env = setupClient(page);
      env.respondWith({ message: "boom" }, 500);
      const { alerts, reloads } = await run(true);

      expect(alerts).toEqual(["An error occurred while deleting jobs. Please try again."]);
      expect(reloads).toEqual([]);
      expect(env.console.errors.join("\n")).toContain("Error deleting jobs:");
    });
  });
});
