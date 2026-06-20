// Production types offered during project onboarding. Each one carries the
// crew guidance and the set of roles typically needed, so the app can show
// "what's needed" for the kind of thing the user is making.

export interface ProductionType {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  crew: string; // human-readable crew-size guidance
  recommendedRoles: string[]; // role names from the seeded roles table
}

// All seeded role names (used for "feature" = everything).
const ALL_ROLES = [
  "Director",
  "Producer",
  "1st Assistant Director",
  "Director of Photography",
  "Camera Operator",
  "Sound Mixer",
  "Boom Operator",
  "Gaffer",
  "Data Wrangler / DIT",
  "Script Supervisor",
  "Location Manager",
  "Props Master",
  "Wardrobe Stylist",
  "Hair & Makeup Artist",
  "Releases / Legal",
  "Food & Craft Services",
  "Safety Person",
  "Editor / Post Handoff",
  "Production Assistant",
  "Still Photographer",
];

export const PRODUCTION_TYPES: ProductionType[] = [
  {
    id: "social",
    label: "TikTok / Reels / Sketch",
    emoji: "📱",
    blurb: "Short vertical video, often shot by one or two people.",
    crew: "1–3 people",
    recommendedRoles: [
      "Director",
      "Director of Photography",
      "Sound Mixer",
      "Editor / Post Handoff",
    ],
  },
  {
    id: "music_video",
    label: "Music Video",
    emoji: "🎵",
    blurb: "Performance or narrative piece set to a track.",
    crew: "4–8 people",
    recommendedRoles: [
      "Director",
      "Producer",
      "Director of Photography",
      "Gaffer",
      "Hair & Makeup Artist",
      "Wardrobe Stylist",
      "Data Wrangler / DIT",
      "Editor / Post Handoff",
    ],
  },
  {
    id: "commercial",
    label: "Commercial / Ad",
    emoji: "📣",
    blurb: "Branded spot with a tight schedule and client deliverables.",
    crew: "6–12 people",
    recommendedRoles: [
      "Director",
      "Producer",
      "1st Assistant Director",
      "Director of Photography",
      "Gaffer",
      "Sound Mixer",
      "Script Supervisor",
      "Hair & Makeup Artist",
      "Wardrobe Stylist",
      "Props Master",
      "Releases / Legal",
      "Editor / Post Handoff",
    ],
  },
  {
    id: "short",
    label: "Short Film",
    emoji: "🎬",
    blurb: "Narrative short — the classic lean indie crew.",
    crew: "~8 people",
    recommendedRoles: [
      "Director",
      "Producer",
      "1st Assistant Director",
      "Director of Photography",
      "Gaffer",
      "Sound Mixer",
      "Data Wrangler / DIT",
      "Script Supervisor",
      "Location Manager",
      "Props Master",
      "Wardrobe Stylist",
      "Hair & Makeup Artist",
      "Releases / Legal",
      "Food & Craft Services",
      "Safety Person",
      "Editor / Post Handoff",
    ],
  },
  {
    id: "feature",
    label: "Feature / Major Movie",
    emoji: "🍿",
    blurb: "Full-length production — every department staffed.",
    crew: "20+ people",
    recommendedRoles: ALL_ROLES,
  },
];

export function getProductionType(id: string | null | undefined): ProductionType | null {
  if (!id) return null;
  return PRODUCTION_TYPES.find((t) => t.id === id) ?? null;
}
