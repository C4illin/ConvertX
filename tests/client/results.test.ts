import { afterEach, describe, expect, test } from "bun:test";

import { type ClientEnv, setupClient } from "./dom";

let env: ClientEnv;
afterEach(() => env.teardown());

const page = (value: number, max: number) => `
  <main>
    <button data-action="download-all">All</button>
    <progress max="${max}" value="${value}"></progress>
    <table><tbody>
      <tr><td><a download="a.csv" href="/download/1/a.csv">a</a></td></tr>
      <tr><td><a download="b.csv" href="/download/1/b.csv">b</a></td></tr>
    </tbody></table>
  </main>`;

describe("results.ts", () => {
  test("does not poll when every file is converted", async () => {
    env = setupClient(page(2, 2), "http://localhost/results/7");
    await env.load("results.ts");
    await Bun.sleep(10);

    expect(env.fetchCalls).toEqual([]);
    expect(env.timers).toEqual([]);
  });

  test("polls /progress/:jobId and replaces the content while converting", async () => {
    env = setupClient(page(1, 2), "http://localhost/results/7");
    env.respondWith("<p id='fresh'>updated</p>");
    await env.load("results.ts");
    await Bun.sleep(10);

    expect(env.fetchCalls).toHaveLength(1);
    expect(env.fetchCalls[0]).toMatchObject({ method: "POST" });
    expect(env.fetchCalls[0]!.url).toEndWith("/progress/7");
    expect(env.timers[0]?.ms).toBe(1000);
    expect(document.getElementById("fresh")?.textContent).toBe("updated");
  });

  test("keeps the page untouched when the progress request fails", async () => {
    env = setupClient(page(1, 2), "http://localhost/results/7");
    env.respondWith({ message: "Job not found." }, 404);
    await env.load("results.ts");
    await Bun.sleep(10);

    expect(document.querySelector("progress")).not.toBeNull();
    expect(document.getElementById("fresh")).toBeNull();
  });

  test("download-all clicks every download link, staggered by 300ms", async () => {
    env = setupClient(page(2, 2), "http://localhost/results/7");
    await env.load("results.ts");

    const clicked: string[] = [];
    for (const link of document.querySelectorAll("a[download]")) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        clicked.push(link.getAttribute("download")!);
      });
    }

    document.querySelector<HTMLElement>("[data-action='download-all']")!.click();

    expect(env.timers.map((t) => t.ms)).toEqual([0, 300]);
    env.timers.forEach((t) => t.fn());
    expect(clicked).toEqual(["a.csv", "b.csv"]);
  });
});
