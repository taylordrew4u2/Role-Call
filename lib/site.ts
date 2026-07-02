// Canonical site URL for SEO metadata, sitemaps, and structured data.
// Vercel exposes the production domain at build time; NEXT_PUBLIC_SITE_URL
// overrides it (set this when a custom domain is attached).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "RoleCall";

export const SITE_DESCRIPTION =
  "Free film production planning app for indie and student filmmakers. " +
  "Generate a shot list from your script, pull the cast from the screenplay, " +
  "assign every crew role, build schedules and call sheets, and pin shoot locations on a map.";
