---
name: run-role-call
description: Build, launch, and drive the RoleCall app (Next.js 16 web app). Use when asked to run, start, serve, smoke-test, or screenshot RoleCall locally — including rendering a page in a headless browser to verify a change.
---

# Run RoleCall

RoleCall is a Next.js 16 (App Router) web app. The agent path is: start the
production server, then drive it with a headless-Chromium driver
(`driver.mjs`, Playwright) that **screenshots a rendered page**.

All paths below are relative to the repo root (`<unit>` = repo root).

> Sandbox note: in this container Chromium cannot reach the local server
> directly (loopback + eth0 are isolated, and the only egress proxy can't see
> localhost). The driver works around this by intercepting every browser
> request and fulfilling it from the **Node** process, which *can* reach the
> server. You don't need to think about it — just run the driver — but that's
> why it's a Playwright script and not plain `chromium-cli`.

## Prerequisites

Node 22 (already present). One-time browser install for the driver:

```bash
npm install
npm install -D playwright
npx playwright install chromium
```

No `apt-get` packages are needed — Playwright's `chromium-headless-shell`
runs as-is. (The Ubuntu `chromium` apt package is a non-functional snap stub;
don't use it.)

## Build

The app builds without real secrets, but Clerk + Postgres env vars must be
*present* or pages throw at request time. Use placeholders for a local run:

```bash
cat > .env.local <<'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZXhhbXBsZS5jb20k
CLERK_SECRET_KEY=sk_test_ZHVtbXlfc2VjcmV0X2tleV9mb3JfbG9jYWxfcnVu
POSTGRES_URL=postgres://user:pass@localhost:5432/rolecall
EOF
npm run build
```

The publishable key is a real-format but fake Clerk dev key (decodes to
`clerk.example.com$`). It lets the unauthenticated **landing page** (`/`)
render. Auth'd pages (`/dashboard`, project pages) need a real Clerk session
and a live database — out of scope for a local smoke test.

## Run (agent path)

Start the server, wait for it, then drive it:

```bash
PORT=3000 npm run start > /tmp/rc.log 2>&1 &
timeout 40 bash -c 'until curl -sf http://127.0.0.1:3000 >/dev/null; do sleep 1; done'
node .claude/skills/run-role-call/driver.mjs / .claude/skills/run-role-call/screenshot.png
```

Expected output (verified):

```
HTTP status: 200
Title:       RoleCall — Film Production Role Tracker
H1:          Every responsibility. Every person. No excuses.
Screenshot:  .claude/skills/run-role-call/screenshot.png
```

The screenshot lands at `.claude/skills/run-role-call/screenshot.png`
(gitignored). **Open it** — it should show the rendered landing page (nav,
hero, feature cards). The `500` console errors it reports are Clerk's
client-side calls failing against the fake key; harmless for the shell.

Driver usage: `node .claude/skills/run-role-call/driver.mjs [path] [outfile]`
(defaults: `/` and the screenshot path above; override the server with
`BASE_URL`).

Stop the server when done:

```bash
pkill -f "next start"
```

## Run (human path)

`npm run dev` (or `npm run start` after a build) serves on
http://localhost:3000 and you open it in a browser. Useless headless — use the
driver above.

## Direct invocation (no browser)

Just check the server serves HTML:

```bash
curl -s http://127.0.0.1:3000 | grep -o "Every responsibility[^<]*"
```

## Gotchas

- **Chromium can't reach the local server in this sandbox.** Plain
  `page.goto('http://localhost:3000')` fails with `ERR_NAME_NOT_RESOLVED`
  (proxy resolves hosts and can't see localhost) or `ERR_CONNECTION_REFUSED`
  (loopback isolated). The driver sidesteps it by `page.route('**/*')` +
  `fetch()` from Node. Keep that pattern if you extend the driver.
- **Resolver hijack.** Even literal IPs fail to "resolve" in Chromium here, so
  the driver launches with `--host-resolver-rules=MAP * 127.0.0.1` purely to
  make resolution *succeed* before interception fulfills the request.
- **Don't use the apt `chromium`** — it's a snap wrapper that errors with
  `snap install chromium`. Use Playwright's Chromium.
- **`PLAYWRIGHT_BROWSERS_PATH`** is preset to `/opt/pw-browsers` in this
  container; `npx playwright install chromium` puts the browser where the
  driver finds it. If the driver can't find a browser, re-run that install.
- **Only `/` renders locally.** Authenticated routes need a real Clerk session
  + Postgres; expect redirects/errors there with placeholder keys.

## Troubleshooting

- `EADDRINUSE` on start → `pkill -f "next start"` then retry.
- Driver prints `ERR_*` / writes no screenshot → the server isn't up; check
  `/tmp/rc.log` and that `curl http://127.0.0.1:3000` returns 200.
- `Cannot find package 'playwright'` → run the Prerequisites install commands
  from the repo root (not `/tmp`).
