const DEFAULT_LOCAL_URL = "http://localhost:3000";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCAL_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getAppUrl(request?: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return DEFAULT_LOCAL_URL;
}
