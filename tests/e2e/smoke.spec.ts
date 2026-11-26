import { expect, test } from "@playwright/test";

test.describe("PulseIssues smoke E2E", () => {
  test("valida /, workspace demo, /api/health y /api/docs sin errores de consola", async ({
    page,
    request,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(
      page.getByText("Proyecto educativo y de portafolio inspirado en Linear"),
    ).toBeVisible();

    const enterWorkspace = page
      .getByRole("link", { name: /Entrar al Workspace Demo/i })
      .first();
    await expect(enterWorkspace).toBeVisible();
    await enterWorkspace.click();

    await expect(page).toHaveURL(/\/workspace/);
    await expect(page.getByText("Workspace de Triaje")).toBeVisible();
    await expect(page.getByText("ENG-101")).toBeVisible();

    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = (await healthRes.json()) as {
      status: string;
      service: string;
      dbLatencyMs: number;
      uptimeSeconds: number;
      version: string;
      timestamp: string;
    };
    expect(healthJson.status).toBe("ok");
    expect(healthJson.service).toBe("pulse-issues-clone");
    expect(typeof healthJson.dbLatencyMs).toBe("number");
    expect(typeof healthJson.uptimeSeconds).toBe("number");
    expect(typeof healthJson.version).toBe("string");
    expect(typeof healthJson.timestamp).toBe("string");

    await page.goto("/api/docs");
    await expect(page.getByText("PulseIssues API").first()).toBeVisible();
    await expect(
      page.getByText("OpenAPI 3.1.0", { exact: true }),
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
