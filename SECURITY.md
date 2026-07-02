# Security Policy

RoleCall takes the security of its users' data seriously — productions trust
the app with scripts, contact details, and shoot locations.

## Supported Versions

RoleCall is a continuously deployed web application. Only the latest deployed
version (the `main` branch) is supported; there are no maintained older
releases.

| Version | Supported |
| ------- | --------- |
| `main` (live app) | ✅ |
| Anything else | ❌ |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via
[GitHub private vulnerability reporting](https://github.com/taylordrew4u2/Role-Call/security/advisories/new)
(Security tab → "Report a vulnerability").

Include as much of the following as you can:

- A description of the vulnerability and its impact
- Steps to reproduce (a proof of concept helps a lot)
- The affected page, API route, or component
- Any suggested fix

### What to expect

- **Acknowledgement** within 72 hours
- **Assessment and triage** within 7 days
- A fix or mitigation as quickly as severity warrants — critical issues are
  prioritized above all feature work
- Credit in the fix's release notes if you'd like it (or anonymity if you
  prefer)

## Scope

In scope:

- The RoleCall web application and its API routes (`/api/*`)
- Authentication/authorization flaws (acting on projects you're not a member
  of, privilege escalation between member roles, invite-link abuse)
- Data exposure (other projects' scripts, members, schedules, or locations)
- Injection of any kind (SQL, XSS, header, etc.)
- The service worker / offline sync layer (e.g., replaying another user's
  queued writes)

Out of scope:

- Vulnerabilities in third-party services themselves (Clerk, Vercel, Neon,
  Resend, OpenStreetMap/Nominatim) — report those upstream
- Denial-of-service / volumetric attacks
- Social engineering, phishing, or physical attacks
- Reports from automated scanners with no demonstrated impact
- Missing security headers without a practical exploit

## Handling of Dependencies

Dependabot alerts are enabled on this repository. Dependency vulnerabilities
are reviewed and patched as part of regular maintenance; critical advisories
are patched out of band.
