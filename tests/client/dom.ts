import { GlobalRegistrator } from "@happy-dom/global-registrator";

import { captureConsole } from "../converters/helpers/converters";

// Bun's native implementations, captured before happy-dom replaces the globals.
const NativeResponse = Response;

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

class FakeXhr {
  method = "";
  url = "";
  sent = false;
  responseText = "";
  upload: { onprogress?: (e: ProgressEvent) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send() {
    this.sent = true;
  }
}

export interface ClientEnv {
  console: ReturnType<typeof captureConsole>;
  xhrs: FakeXhr[];
  fetchCalls: FetchCall[];
  timers: { fn: () => void; ms: number }[];
  /** Responds to every following fetch call. */
  respondWith: (body: string | object, status?: number) => void;
  load: (script: string) => Promise<void>;
  teardown: () => Promise<void>;
}

let importCounter = 0;

/** Sets up a DOM from `html`, runs a public/*.ts client script in it and records network/timers. */
export function setupClient(html: string, url = "http://localhost/"): ClientEnv {
  const output = captureConsole();
  GlobalRegistrator.register({ url });
  document.head.innerHTML = '<meta name="webroot" content="">';
  document.body.innerHTML = html;

  const fetchCalls: FetchCall[] = [];
  const timers: ClientEnv["timers"] = [];
  const xhrs: FakeXhr[] = [];
  globalThis.XMLHttpRequest = class extends FakeXhr {
    constructor() {
      super();
      xhrs.push(this);
    }
  } as unknown as typeof XMLHttpRequest;
  let response: { body: string | object; status: number } = { body: "", status: 200 };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    fetchCalls.push({
      url: String(request?.url ?? input),
      method: request?.method ?? init?.method ?? "GET",
      body: request ? await request.clone().text() : ((init?.body as string | undefined) ?? null),
    });
    const isText = typeof response.body === "string";
    return new NativeResponse(isText ? (response.body as string) : JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": isText ? "text/html" : "application/json" },
    });
  }) as typeof fetch;

  globalThis.setTimeout = ((fn: () => void, ms = 0) => {
    timers.push({ fn, ms });
    return timers.length;
  }) as unknown as typeof setTimeout;

  return {
    fetchCalls,
    timers,
    xhrs,
    console: output,
    respondWith: (body, status = 200) => {
      response = { body, status };
    },
    load: async (script) => {
      await import(`../../public/${script}?${importCounter++}`);
    },
    teardown: async () => {
      await GlobalRegistrator.unregister();
      output.restore();
    },
  };
}
