import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoleCall — Film Production",
    short_name: "RoleCall",
    description:
      "Plan your film production: shot lists from the script, cast, crew roles, schedules, and locations.",
    start_url: "/dashboard",
    // Whole site in scope so any RoleCall URL (invite links, project pages)
    // opens inside the installed app instead of bouncing out to the browser.
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#dc2626",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
