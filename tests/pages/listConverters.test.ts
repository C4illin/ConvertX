import { describe, expect, test } from "bun:test";
import { getAllInputs, getAllTargets } from "../../src/converters/main";
import { createUser, request } from "./helpers/app";

describe("GET /converters", () => {
  test("redirects to the login page without a session", async () => {
    const response = await request("/converters", { headers: { accept: "text/html" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("lists every converter with the number of inputs and targets", async () => {
    const user = await createUser();

    const body = await (await request("/converters", { cookies: { auth: user.token } })).text();

    for (const [converter, targets] of Object.entries(getAllTargets())) {
      expect(body).toContain(
        `<td>${converter}</td><td>Count: ${getAllInputs(converter).length}<ul>`,
      );
      expect(body).toContain(`Count: ${targets.length}<ul>`);
    }
  });

  test("lists the inputs and targets of a converter", async () => {
    const user = await createUser();

    const body = await (await request("/converters", { cookies: { auth: user.token } })).text();

    expect(body).toContain(
      "<td>vcf</td><td>Count: 1<ul><li>vcf</li></ul></td><td>Count: 1<ul><li>csv</li></ul></td>",
    );
  });
});
