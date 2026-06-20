// Headless browser driver for RoleCall (a Next.js web app).
//
// Usage:
//   node .claude/skills/run-role-call/driver.mjs [path] [outfile]
//     path     URL path to visit (default "/")
//     outfile  screenshot output (default <skill>/screenshot.png)
//   Env: BASE_URL (default http://127.0.0.1:3000)
//
// Why this is not just `page.goto`: in the sandbox this runs in, Chromium's
// network is isolated from the local server (loopback + eth0 both refuse) and
// the only egress is a proxy that can't reach localhost. So we DON'T let
// Chromium touch the network — every request is intercepted and fulfilled by
// fetching from the dev server in THIS Node process, which *can* reach it.
import { chromium } from "playwright";

const local = process.env.BASE_URL || "http://127.0.0.1:3000";
const path = process.argv[2] || "/";
const out = process.argv[3] || ".claude/skills/run-role-call/screenshot.png";
const ORIGIN = "http://app.local"; // virtual origin Chromium thinks it's on

// Map every hostname to loopback so resolution *succeeds* (the sandbox's
// resolver otherwise fails even on literal IPs). We never actually connect —
// requests are fulfilled by the route handler below — but Chromium still wants
// a successful DNS resolution before it hands the request to the interceptor.
const browser = await chromium.launch({
  args: ["--no-sandbox", "--host-resolver-rules=MAP * 127.0.0.1"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.route("**/*", async (route) => {
  const u = route.request().url();
  try {
    const r = await fetch(local + new URL(u).pathname + new URL(u).search);
    const body = Buffer.from(await r.arrayBuffer());
    await route.fulfill({
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "text/html" },
      body,
    });
  } catch {
    await route.abort();
  }
});

const resp = await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1200); // let client render

console.log("Path:       ", path);
console.log("HTTP status:", resp?.status());
console.log("Title:      ", await page.title());
console.log("H1:         ", (await page.locator("h1").first().textContent().catch(() => "")) ?? "");
console.log("Console errs:", errors.length ? errors.slice(0, 5) : "none");

await page.screenshot({ path: out, fullPage: true });
console.log("Screenshot: ", out);

await browser.close();
