import { db } from "./index";
import { roles } from "./schema";

// 20 production roles for a short film, with realistic duties.
// 16 are marked critical (is_critical: true).
const SEED_ROLES = [
  {
    name: "Director",
    category: "Direction",
    isCritical: true,
    sortOrder: 1,
    duties: [
      "Lead the creative vision of the film",
      "Collaborate with DP on shot design and blocking",
      "Direct actors through every scene",
      "Approve final shot list and schedule",
      "Conduct rehearsals with cast",
      "Make final on-set creative decisions",
      "Review dailies and provide feedback",
    ],
  },
  {
    name: "Producer",
    category: "Production",
    isCritical: true,
    sortOrder: 2,
    duties: [
      "Manage overall production budget and schedule",
      "Secure locations, permits, and insurance",
      "Coordinate crew, cast contracts, and releases",
      "Handle logistics and vendor relationships",
      "Serve as primary point of contact for all departments",
      "Troubleshoot day-of issues to keep shoot on track",
    ],
  },
  {
    name: "1st Assistant Director",
    category: "Direction",
    isCritical: true,
    sortOrder: 3,
    duties: [
      "Create and distribute the daily call sheet",
      "Run the set and maintain the shooting schedule",
      "Call 'Action' and 'Cut' at director's cue",
      "Manage extras and background action",
      "Ensure crew is ready for each setup",
      "Track day's progress against the shot list",
      "Communicate schedule changes to all departments",
    ],
  },
  {
    name: "Director of Photography",
    category: "Camera",
    isCritical: true,
    sortOrder: 4,
    duties: [
      "Design the visual look and lighting of the film",
      "Choose and operate the camera package",
      "Direct the camera and lighting crew",
      "Create and execute the shot list with the director",
      "Set exposure, white balance, and frame rates",
      "Oversee lens selection and camera movement",
      "Ensure footage is technically correct and stylistically consistent",
    ],
  },
  {
    name: "Camera Operator",
    category: "Camera",
    isCritical: false,
    sortOrder: 5,
    duties: [
      "Operate the camera per the DP's direction",
      "Execute dolly, handheld, or gimbal moves",
      "Maintain focus during complex shots",
      "Assist DP in lighting and camera setup",
    ],
  },
  {
    name: "Sound Mixer",
    category: "Sound",
    isCritical: true,
    sortOrder: 6,
    duties: [
      "Record production audio on set",
      "Place and manage microphones (boom, lavalier)",
      "Monitor audio levels and quality in real time",
      "Coordinate with boom operator for best mic placement",
      "Maintain sound reports and metadata",
      "Flag and resolve audio issues immediately",
    ],
  },
  {
    name: "Boom Operator",
    category: "Sound",
    isCritical: false,
    sortOrder: 7,
    duties: [
      "Operate the boom pole and microphone on set",
      "Stay out of frame while capturing clean audio",
      "Coordinate mic placement with the sound mixer",
      "Assist with placing lavalier microphones on talent",
    ],
  },
  {
    name: "Gaffer",
    category: "Lighting",
    isCritical: true,
    sortOrder: 8,
    duties: [
      "Execute the lighting plan designed by the DP",
      "Manage the lighting crew and electrical department",
      "Rig, place, and adjust all lighting fixtures",
      "Ensure electrical safety on set",
      "Source and manage lighting equipment",
      "Adapt lighting quickly for schedule changes",
    ],
  },
  {
    name: "Data Wrangler / DIT",
    category: "Camera",
    isCritical: true,
    sortOrder: 9,
    duties: [
      "Ingest and back up all camera footage daily (3-2-1 rule)",
      "Verify every clip was captured and is playable",
      "Apply and manage on-set color LUTs",
      "Format and label media for editorial handoff",
      "Maintain a detailed data log per card/roll",
      "Coordinate with editor on codec and format requirements",
    ],
  },
  {
    name: "Script Supervisor",
    category: "Direction",
    isCritical: true,
    sortOrder: 10,
    duties: [
      "Track continuity of action, costumes, props, and set dressing",
      "Log every take, noting the director's preferred takes",
      "Maintain the lined script with camera coverage notes",
      "Ensure scene-to-scene continuity across shoot days",
      "Provide daily editor notes and sound reports",
      "Flag continuity errors before they become edit problems",
    ],
  },
  {
    name: "Location Manager",
    category: "Production",
    isCritical: true,
    sortOrder: 11,
    duties: [
      "Scout, secure, and permit all filming locations",
      "Serve as on-set liaison with location owners",
      "Manage parking, access, and noise control",
      "Ensure the location is ready before crew arrival",
      "Restore each location to its original condition after wrap",
      "Handle location-related emergencies and neighbor concerns",
    ],
  },
  {
    name: "Props Master",
    category: "Art",
    isCritical: true,
    sortOrder: 12,
    duties: [
      "Source, purchase, or build all required props",
      "Track every prop through every scene",
      "Maintain prop continuity across takes and shoot days",
      "Manage the prop table on set",
      "Coordinate hero vs. stand-in props",
      "Return or dispose of props after production",
    ],
  },
  {
    name: "Wardrobe Stylist",
    category: "Art",
    isCritical: true,
    sortOrder: 13,
    duties: [
      "Design or source all costumes per script and director's vision",
      "Fit and alter wardrobe for each actor",
      "Maintain wardrobe continuity across scenes",
      "Prepare and transport wardrobe to and from set",
      "Steam, clean, and repair costumes as needed on shoot day",
      "Document each actor's look per scene",
    ],
  },
  {
    name: "Hair & Makeup Artist",
    category: "Art",
    isCritical: true,
    sortOrder: 14,
    duties: [
      "Design and apply makeup for all cast members",
      "Style hair consistent with character and scene",
      "Maintain makeup and hair continuity across takes",
      "Perform touch-ups between takes",
      "Handle special effects makeup if required",
      "Manage the makeup kit and supplies",
    ],
  },
  {
    name: "Releases / Legal",
    category: "Production",
    isCritical: true,
    sortOrder: 15,
    duties: [
      "Prepare and collect signed talent releases from all on-screen talent",
      "Obtain location release agreements",
      "Ensure music and IP used on set are properly licensed",
      "Review and track all signed documents",
      "Consult on any legal issues that arise during production",
      "Maintain a release file for post-production and distribution",
    ],
  },
  {
    name: "Food & Craft Services",
    category: "Production",
    isCritical: true,
    sortOrder: 16,
    duties: [
      "Plan and procure meals and craft services for the full crew and cast",
      "Accommodate dietary restrictions and allergies",
      "Set up and maintain the craft services table throughout the day",
      "Coordinate meal breaks with the 1st AD",
      "Keep the catering area clean and stocked",
      "Manage the catering budget",
    ],
  },
  {
    name: "Safety Person",
    category: "Production",
    isCritical: true,
    sortOrder: 17,
    duties: [
      "Conduct a safety briefing for the full crew at the start of each shoot day",
      "Identify and mitigate on-set hazards",
      "Maintain a fully stocked first aid kit",
      "Serve as point of contact for any injury or emergency",
      "Ensure compliance with safety protocols for stunts, pyrotechnics, or vehicles",
      "Complete an incident report for any accident",
    ],
  },
  {
    name: "Editor / Post Handoff",
    category: "Post-Production",
    isCritical: true,
    sortOrder: 18,
    duties: [
      "Receive and organize all footage and audio from the DIT",
      "Create an offline edit from dailies",
      "Sync and align all audio tracks to picture",
      "Assemble the rough cut for director review",
      "Manage project files, proxies, and archives",
      "Coordinate with colorist, sound designer, and VFX artists",
    ],
  },
  {
    name: "Production Assistant",
    category: "Production",
    isCritical: false,
    sortOrder: 19,
    duties: [
      "Support all departments with general tasks",
      "Run errands for equipment, supplies, and food",
      "Assist with set setup and wrap",
      "Lock up filming areas during sensitive takes",
      "Assist the 1st AD with background and extras wrangling",
    ],
  },
  {
    name: "Still Photographer",
    category: "Production",
    isCritical: false,
    sortOrder: 20,
    duties: [
      "Capture behind-the-scenes and promotional stills",
      "Photograph key scenes for press and marketing materials",
      "Stay out of the way of the primary camera",
      "Deliver edited images within an agreed-upon turnaround",
      "Obtain a signed model release from any photographer-hired subjects",
    ],
  },
];

/**
 * Seeds the roles table if it is empty.
 * Safe to call multiple times — won't duplicate data.
 */
export async function seedRoles() {
  const existing = await db.select().from(roles);
  if (existing.length > 0) {
    console.log(`Roles already seeded (${existing.length} found). Skipping.`);
    return;
  }

  console.log("Seeding roles table…");
  await db.insert(roles).values(
    SEED_ROLES.map((r) => ({
      name: r.name,
      category: r.category,
      isCritical: r.isCritical,
      sortOrder: r.sortOrder,
      duties: r.duties,
    }))
  );
  console.log(`Seeded ${SEED_ROLES.length} roles.`);
}
