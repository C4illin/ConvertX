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
    <div class="select_container"><div class="convert_to_popup hidden"></div></div>
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
    expect(submit().value).toBe("Uploading...");

    env.xhrs[0]!.responseText = JSON.stringify({ message: "ok" });
    env.xhrs[0]!.onload!();
    expect(document.querySelector("#file-list progress")).toBeNull();
    expect(submit().disabled).toBe(true);

    document.querySelector<HTMLElement>(".target[data-value='mp3,ffmpeg']")!.click();
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

  describe("drop zone", () => {
    test("highlights while dragging over and clears on leave or drop", async () => {
      await start();
      const zone = document.getElementById("dropzone")!;

      zone.dispatchEvent(new Event("dragover", { cancelable: true }));
      expect(zone.classList.contains("dragover")).toBe(true);
      zone.dispatchEvent(new Event("dragleave"));
      expect(zone.classList.contains("dragover")).toBe(false);

      zone.dispatchEvent(new Event("dragover", { cancelable: true }));
      dropFile("a.wav");
      expect(zone.classList.contains("dragover")).toBe(false);
    });

    test("warns and ignores drops without files", async () => {
      await start();
      const event = new Event("drop", { cancelable: true }) as Event & { dataTransfer: unknown };
      event.dataTransfer = { files: [] };
      document.getElementById("dropzone")!.dispatchEvent(event);
      await settle();

      expect(env.console.warnings).toEqual([
        "No files dropped — likely a URL or unsupported source.",
      ]);
      expect(env.fetchCalls).toEqual([]);
    });

    test("accepts several files but asks for converters only once", async () => {
      await start();
      dropFile("a.wav");
      dropFile("b.wav");
      await settle();

      expect(document.querySelectorAll("#file-list tr")).toHaveLength(2);
      expect(env.fetchCalls).toHaveLength(1);
      expect(env.xhrs).toHaveLength(2);
    });
  });

  test("handles files picked through the file input", async () => {
    await start();
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    Object.defineProperty(input, "files", { value: [new File(["x"], "pick.wav")] });
    input.dispatchEvent(new Event("change"));
    await settle();

    expect(document.querySelector("#file-list td")!.textContent).toBe("pick.wav");
  });

  describe("format search", () => {
    const visible = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".target"))
        .filter((t) => !t.classList.contains("hidden"))
        .map((t) => t.dataset.value);
    const search = (value: string) => {
      const input = document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!;
      input.value = value;
      input.dispatchEvent(new Event("input"));
    };

    test("filters targets and hides converter groups without matches", async () => {
      await start();
      dropFile("a.mp3");
      await settle();

      search("mp");
      expect(visible()).toEqual(["mp3,ffmpeg"]);
      const groups = document.querySelectorAll<HTMLElement>(".convert_to_group");
      expect(groups[0]!.classList.contains("hidden")).toBe(false);
      expect(groups[1]!.classList.contains("hidden")).toBe(true);

      search("");
      expect(visible()).toHaveLength(3);
    });

    test("shows the popup on focus and hides it on blur", async () => {
      await start();
      dropFile("a.mp3");
      await settle();
      const input = document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!;
      const popup = document.querySelector<HTMLElement>(".convert_to_popup")!;

      input.dispatchEvent(new Event("focus"));
      expect(popup.classList.contains("hidden")).toBe(false);
      input.dispatchEvent(new Event("blur"));
      expect(popup.classList.contains("hidden")).toBe(true);
    });

    test("keeps the popup open when focus moves to a target", async () => {
      await start();
      dropFile("a.mp3");
      await settle();
      const input = document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!;
      const popup = document.querySelector<HTMLElement>(".convert_to_popup")!;

      input.dispatchEvent(new Event("focus"));
      const blur = new Event("blur") as Event & { relatedTarget: unknown };
      blur.relatedTarget = document.querySelector(".target");
      input.dispatchEvent(blur);
      expect(popup.classList.contains("hidden")).toBe(false);
    });

    test("disables Convert again when the search is cleared", async () => {
      await start();
      dropFile("a.mp3");
      await settle();
      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();
      document.querySelector<HTMLElement>(".target")!.click();
      expect(submit().disabled).toBe(false);

      document
        .querySelector<HTMLInputElement>("input[name=convert_to_search]")!
        .dispatchEvent(new Event("search"));
      expect(submit().disabled).toBe(true);
    });
  });

  describe("target selection", () => {
    test("works with keyboard activation, which only fires click", async () => {
      await start();
      dropFile("a.wav");
      await settle();
      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();

      document.querySelector<HTMLElement>(".target[data-value='wav,other']")!.click();

      expect(submit().disabled).toBe(false);
      expect(document.querySelector<HTMLSelectElement>("select[name=convert_to]")!.value).toBe(
        "wav,other",
      );
    });

    test("keeps focus in the search input while the mouse is pressed on a target", async () => {
      await start();
      dropFile("a.wav");
      await settle();

      const event = new MouseEvent("mousedown", { cancelable: true, bubbles: true });
      document.querySelector<HTMLElement>(".target")!.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    test("binds the popup behaviour to the popup rendered by the server", async () => {
      await start();
      dropFile("a.mp3");
      await settle();
      const input = document.querySelector<HTMLInputElement>("input[name=convert_to_search]")!;

      input.dispatchEvent(new Event("focus"));

      expect(document.querySelectorAll(".convert_to_popup")).toHaveLength(1);
      expect(document.querySelector(".convert_to_popup")!.classList.contains("hidden")).toBe(false);
    });
  });

  describe("upload", () => {
    test("shows the upload progress in the file row", async () => {
      await start();
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.upload.onprogress!({ loaded: 25, total: 100 } as ProgressEvent);

      expect(document.querySelector("progress")!.value).toBe(25);
      expect(env.console.logs).toContain("upload progress (a.wav): 25");
    });

    test("warns about an unreadable upload response", async () => {
      await start();
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.responseText = "<html>";
      env.xhrs[0]!.onload!();

      expect(env.console.warnings).toEqual(["Failed to parse upload response: <html>"]);
    });

    test("logs a failed upload", async () => {
      await start();
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.onerror!();

      expect(env.console.logs).toContain("Upload failed");
    });

    test("drops a failed upload and keeps Convert disabled even with a preselected format", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.onerror!();
      dropFile("b.wav");
      env.xhrs[1]!.onerror!();

      expect(document.querySelectorAll("#file-list tr")).toHaveLength(0);
      expect(submit().disabled).toBe(true);
      expect(submit().value).toBe("Convert");
    });

    test("only submits files that were uploaded successfully", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      dropFile("b.wav");
      await settle();

      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();
      env.xhrs[1]!.onerror!();
      document.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));

      expect(submit().disabled).toBe(false);
      expect(document.querySelectorAll("#file-list td:first-child")).toHaveLength(1);
      expect(document.querySelector<HTMLInputElement>("input[name=file_names]")!.value).toBe(
        JSON.stringify(["a.wav"]),
      );
    });

    test("treats an HTTP error response as a failed upload", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.status = 500;
      env.xhrs[0]!.responseText = JSON.stringify({ message: "boom" });
      env.xhrs[0]!.onload!();

      expect(document.querySelectorAll("#file-list tr")).toHaveLength(0);
      expect(submit().disabled).toBe(true);
      expect(submit().value).toBe("Convert");
    });

    test("does not leave the file stuck in uploading when the response is unreadable", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      await settle();

      env.xhrs[0]!.responseText = "<html>";
      env.xhrs[0]!.onload!();

      expect(document.querySelectorAll("#file-list tr")).toHaveLength(0);
      expect(submit().value).toBe("Convert");
    });

    test("forgets the selected format when the last file is removed", async () => {
      await start();
      dropFile("a.wav");
      await settle();
      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();
      document.querySelector<HTMLElement>(".target")!.click();
      env.respondWith({ message: "File deleted successfully." });
      document.querySelector<HTMLButtonElement>("#file-list button")!.click();
      await settle();

      dropFile("b.wav");
      env.xhrs[1]!.responseText = "{}";
      env.xhrs[1]!.onload!();

      expect(submit().disabled).toBe(true);
    });

    test("pre-selects the format right away when the upload finished before the converters arrived", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();
      await settle();

      expect(submit().disabled).toBe(false);
    });

    test("enables Convert after the upload when a format is already selected", async () => {
      await start("http://localhost/?to=mp3");
      dropFile("a.wav");
      await settle();
      expect(submit().disabled).toBe(true);

      env.xhrs[0]!.responseText = "{}";
      env.xhrs[0]!.onload!();

      expect(submit().disabled).toBe(false);
      expect(submit().value).toBe("Convert");
    });
  });
});
