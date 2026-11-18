import { afterEach, describe, expect, test } from "bun:test";

import { type ClientEnv, setupClient } from "./dom";

let env: ClientEnv;
afterEach(() => env.teardown());

const page = `
  <h1>Convert</h1>
  <div id="dropzone"></div>
  <form action="/convert" method="post">
    <input type="hidden" name="file_names" />
    <input type="file" multiple />
    <table><tbody id="file-list"></tbody></table>
    <input name="convert_to_search" />
    <div class="convert_to_popup hidden"></div>
    <div class="select_container"></div>
    <input type="submit" value="Convert" disabled />
  </form>`;

const fragment = `
  <article class="convert_to_popup hidden">
    <article class="convert_to_group flex" data-converter="ffmpeg">
      <button class="target" type="button" data-value="mp3,ffmpeg" data-target="mp3" data-converter="ffmpeg">mp3</button>
      <button class="target" type="button" data-value="wav,ffmpeg" data-target="wav" data-converter="ffmpeg">wav</button>
    </article>
    <article class="convert_to_group flex" data-converter="other">
      <button class="target" type="button" data-value="wav,other" data-target="wav" data-converter="other">wav</button>
    </article>
  </article>
  <select name="convert_to"><option value="">Convert to</option>
    <option value="mp3,ffmpeg">mp3</option><option value="wav,ffmpeg">wav</option><option value="wav,other">wav</option>
  </select>`;

const submit = () => document.querySelector<HTMLInputElement>("input[type='submit']")!;
const dropFile = (name: string) => {
  const event = new Event("drop", { cancelable: true }) as Event & { dataTransfer: unknown };
  event.dataTransfer = { files: [new File(["x"], name)] };
  document.getElementById("dropzone")!.dispatchEvent(event);
};
const settle = () => Bun.sleep(10);

async function start(url = "http://localhost/") {
  env = setupClient(page, url);
  env.respondWith(fragment);
  await env.load("script.ts");
}

describe("script.ts", () => {
  test("dropping a file adds a row, sets the title and requests the converters", async () => {
    await start();
    dropFile("song.wav");
    await settle();

    expect(document.querySelector("h1")!.textContent).toBe("Convert .wav");
    expect(document.querySelector("#file-list td")!.textContent).toBe("song.wav");
    expect(document.querySelector("input[type=file]")!.getAttribute("accept")).toBe(".wav");
    expect(env.fetchCalls).toHaveLength(1);
    expect(env.fetchCalls[0]!.url).toEndWith("/conversions");
    expect(JSON.parse(env.fetchCalls[0]!.body!)).toEqual({ fileType: "wav" });
    expect(document.querySelectorAll(".target")).toHaveLength(3);
  });

  test("renders file names as text, never as HTML", async () => {
    await start();
    dropFile("<img src=x onerror=alert(1)>.txt");
    await settle();

    expect(document.querySelector("#file-list img")).toBeNull();
    expect(document.querySelector("#file-list td")!.textContent).toBe(
      "<img src=x onerror=alert(1)>.txt",
    );
  });

  test("uploads the file via XHR and keeps Convert disabled until a format is chosen", async () => {
    await start();
    dropFile("song.wav");
    await settle();

    expect(env.xhrs).toHaveLength(1);
    expect(env.xhrs[0]).toMatchObject({ method: "POST", url: "/upload", sent: true });
    expect(submit().disabled).toBe(true);
    expect(submit().textContent).toBe("Uploading...");

    env.xhrs[0]!.responseText = JSON.stringify({ message: "ok" });
    env.xhrs[0]!.onload!();
    expect(document.querySelector("#file-list progress")).toBeNull();
    expect(submit().disabled).toBe(true);

    document.querySelector<HTMLElement>(".target[data-value='mp3,ffmpeg']")!.onmousedown!(
      new MouseEvent("mousedown"),
    );
    expect(submit().disabled).toBe(false);
    expect(document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!.value).toBe(
      "mp3 using ffmpeg",
    );
    expect(document.querySelector<HTMLSelectElement>("select[name=convert_to]")!.value).toBe(
      "mp3,ffmpeg",
    );
  });

  test("writes the file names into the form on submit", async () => {
    await start();
    dropFile("a.wav");
    await settle();

    document.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));

    expect(document.querySelector<HTMLInputElement>("input[name=file_names]")!.value).toBe(
      JSON.stringify(["a.wav"]),
    );
  });

  test("removing the last file resets the page and tells the server", async () => {
    await start();
    dropFile("a.wav");
    await settle();
    env.respondWith({ message: "File deleted successfully." });

    document.querySelector<HTMLButtonElement>("#file-list button")!.click();
    await settle();

    expect(document.querySelectorAll("#file-list tr")).toHaveLength(0);
    expect(document.querySelector("h1")!.textContent).toBe("Convert ");
    expect(document.querySelector("input[type=file]")!.hasAttribute("accept")).toBe(false);
    expect(env.fetchCalls.at(-1)!.url).toEndWith("/delete");
    expect(JSON.parse(env.fetchCalls.at(-1)!.body!)).toEqual({ filename: "a.wav" });
  });

  describe("pre-selection via URL parameters", () => {
    test("selects the target of the requested converter", async () => {
      await start("http://localhost/?to=wav&converter=other");
      dropFile("a.mp3");
      await settle();

      expect(document.querySelector<HTMLSelectElement>("select[name=convert_to]")!.value).toBe(
        "wav,other",
      );
      expect(document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!.value).toBe(
        "wav using other",
      );
    });

    test("falls back to the first converter offering the format", async () => {
      await start("http://localhost/?to=wav");
      dropFile("a.mp3");
      await settle();

      expect(document.querySelector<HTMLSelectElement>("select[name=convert_to]")!.value).toBe(
        "wav,ffmpeg",
      );
    });

    test("ignores unknown formats", async () => {
      await start("http://localhost/?to=flac");
      dropFile("a.mp3");
      await settle();

      expect(document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!.value).toBe(
        "",
      );
    });
  });
});
