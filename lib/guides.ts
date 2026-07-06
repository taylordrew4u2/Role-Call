// Public, indexable production guides. Each block is either a heading (##),
// a list item line (- ), or a paragraph. Rendered by app/guides/[slug].

export interface Guide {
  slug: string;
  title: string;
  description: string;
  minutes: number;
  body: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "shot-list-from-screenplay",
    title: "How to Build a Shot List from a Screenplay",
    description:
      "A practical, step-by-step method for turning script pages into a camera-ready shot list — coverage patterns, shot sizes, and how to avoid missing footage on set.",
    minutes: 8,
    body: `A shot list is the bridge between the script and the shoot day. Without one, you're deciding coverage on set while the light changes and your cast waits. With one, every setup has a purpose and you know the scene is complete before you move on.

## Start from scenes, not shots

Break the screenplay into scenes first. Every slug line (INT. KITCHEN — DAY) is a scene boundary, and each scene gets its own mini shot plan. Resist the urge to plan shots for the whole film in one pass — scene by scene keeps the coverage honest.

For each scene, write one sentence describing what must be clear to the audience by the end of it. That sentence decides your coverage. If the point of the scene is "Jane realizes Mike lied," you need her face at the moment of realization more than you need a beautiful wide.

## The default coverage pattern

For a standard dialogue scene, the classic pattern still works because it cuts together reliably:

- A master (wide) that holds the whole scene, geography, and blocking
- Over-the-shoulder or medium on character A
- Over-the-shoulder or medium on character B
- Close-ups on each character for the emotional beats
- Inserts for anything the audience must read: a phone screen, a letter, hands

Shoot the master first. It sets blocking, eyelines, and continuity for every tighter setup that follows. Then work inward: mediums, then close-ups, so performances peak when the camera is closest.

## Shot sizes and when to use them

- Wide (WS): geography, entrances, isolation. Use sparingly — wides eat time to light.
- Medium (MS): the workhorse. Body language plus facial expression.
- Medium close-up (MCU): standard dialogue coverage. Most of your day.
- Close-up (CU): decisions, realizations, lies. Save it for beats that matter.
- Insert: any object with story information. Always grab these — they save scenes in the edit.

## One camera changes the math

On a single-camera shoot (which is most indie and student productions), each additional character in a conversation multiplies setups. A two-person scene needs roughly 5 setups; a four-person dinner scene can need 10 or more. When you build the list, plan one clean single per speaking character plus the master — you can drop shots on the day, but you can't invent coverage you never captured.

With two cameras you can hold a two-shot while grabbing a single, which is why camera setup should be decided before the shot list is final, not after.

## Tag every shot with who's in it

The single most useful column on a shot list isn't shot size — it's cast. Tagging every shot with the characters in frame lets you reorganize the day around actor availability: shoot everything with your lead who has to leave at 3pm first, then pick up the reverses. It also generates your day-out-of-days for free: sort by character and you know exactly which days each actor is needed.

## Number for the edit, not for pride

Use scene-based numbering (12A, 12B, 12C) rather than a global counter. When the schedule shuffles — and it will — scene-based numbers stay meaningful, and your editor can find the coverage for scene 12 without a decoder ring.

## The 5-minute audit

Before you lock the list, walk each scene and ask: if I only got these shots, could the scene cut together? Is there a close-up for the story beat? An insert for every object mentioned in the action lines? A way in and a way out of the scene? Five minutes per scene here saves reshoots later.`,
  },
  {
    slug: "call-sheet-basics",
    title: "Call Sheet Basics for Student and Indie Films",
    description:
      "What actually belongs on a call sheet, who needs it, and the mistakes that make crews miss call times.",
    minutes: 6,
    body: `A call sheet is the one document everyone on a production reads. It answers three questions for every person on the crew: where do I go, when do I get there, and what are we shooting. Everything else is decoration.

## The non-negotiables

- General crew call: the time work starts. Not the time people wake up, park, or find coffee — the time work starts.
- Location with a real address: "the park" is not an address. Include parking instructions and the entrance to use.
- Scenes being shot, in order: with page counts so people can gauge the day.
- Cast list with individual call times: actors in later scenes shouldn't sit around for six hours.
- Weather, sunrise and sunset: exteriors live and die by this.
- Contacts: at minimum the 1st AD (or whoever runs the day) and the production's phone number.
- Nearest hospital: nobody needs it until they urgently do.

## Individual calls beat one blanket call

The most common student-film mistake is calling everyone at the same time. Makeup-heavy cast need earlier calls; an actor in one afternoon scene needs an afternoon call. Staggered calls respect people's time — and tired volunteers who waited four hours give worse performances and don't come back for reshoots.

## Meals are schedule, not hospitality

Crews expect a meal roughly every six hours from call. Put lunch on the call sheet as a scheduled item with a time, and protect it. A shoot that skips lunch quietly loses the crew's goodwill and speed for the whole afternoon — the half hour you "saved" costs you an hour of sluggish setups.

## Send it the night before, then again in the morning

The call sheet goes out the evening before the shoot day (so people can plan travel) and once more in the morning as a reminder. Any change after it's sent — location, call time, scene order — gets called out explicitly, never silently edited. "V2, LUNCH MOVED TO 1PM" in the subject line beats a quiet swap that half the crew misses.

## One page if it fits

A call sheet nobody reads is worse than no call sheet. Keep it to a single page when the production is small: day info at the top, scenes in the middle, cast calls below, contacts and safety at the bottom. If your call sheet needs a table of contents, your shoot day probably needs to be two days.`,
  },
  {
    slug: "one-camera-coverage",
    title: "Single-Camera Coverage: Shooting a Conversation with One Camera",
    description:
      "Coverage patterns, shooting order, and continuity tricks for productions with exactly one camera — which is most of them.",
    minutes: 7,
    body: `Most indie and student films shoot on one camera — a mirrorless body, a rented cinema camera, or a phone. One camera doesn't limit what you can make; it changes the order you make it in.

## The rule: shoot out one side, then turn around

Every time the camera crosses to the other side of a conversation, you re-light and re-dress the frame. That's the expensive move. So you shoot everything pointing one direction first — the master from A's side, the medium on B, the close-up on B — and only then "turn around" for A's coverage.

Actors repeat the full scene every take, even when the camera is on the other person. Off-camera performance matters: your lead's close-up is only as good as the reading they're reacting to.

## A workable pattern for a two-person scene

- Master wide, favoring the axis you'll cut on. Two or three takes.
- Medium over-the-shoulder on character B. Two takes.
- Close-up on B for the key beats. Two takes.
- Turn around: medium OTS on A, then close-up on A.
- Inserts last — hands, props, screens — while the location is still dressed.

That's six setups and, at 20 minutes a setup, roughly a two-hour scene. Knowing that number before the day is how you build a schedule that survives contact with reality.

## Respect the 180-degree line

Draw an imaginary line between the two actors. Keep the camera on one side of it for the whole scene, and screen direction stays consistent — A looks left, B looks right, and the cuts feel invisible. Cross the line mid-scene and the characters appear to swap places. If you must cross, do it on a move or with a neutral head-on shot.

## Continuity is your second camera

With one camera, every angle happens at a different time — sometimes hours apart. The things that break the illusion are the small ones: a coffee cup's fullness, which hand held the phone, a jacket zipped or open. Photograph the frame at the start of the scene, and give someone — anyone — the explicit job of watching continuity. On a five-person crew, that's usually whoever is closest to the monitor.

## When one camera means a phone

A phone shoot follows all the same rules with two adjustments. First, lock your exposure and focus per setup — autoexposure drifting mid-take is the most common phone-footage tell. Second, phone lenses are wide, so get physically closer for close-ups instead of pinch-zooming, which is a digital crop that costs you quality.

## Plan one person per frame

A practical scheduling trick for single-camera shoots: default to coverage that holds one character per shot. Singles are easier to light, easier to schedule around actor availability, and cut together more forgivingly than group shots where everyone must nail the take simultaneously. Save the two-shots for moments where the relationship is the point.`,
  },
  {
    slug: "film-crew-roles-explained",
    title: "Film Crew Roles Explained: Who Does What on a Small Set",
    description:
      "The core crew positions, what each one actually does, and how to cover all of them with three people.",
    minutes: 8,
    body: `Feature crews run to hundreds of people. A student short might have three. The roles don't disappear on a small set — they collapse onto fewer shoulders. Knowing what each role covers tells you what's silently not being done when nobody owns it.

## The core roles

- Director: owns the creative result — performances, coverage, tone. On set, every question ends at the director.
- Producer: owns everything that lets shooting happen — money, locations, permissions, people, food.
- 1st Assistant Director (1st AD): owns time. Builds the schedule, runs the set, calls the roll. The director dreams; the 1st AD keeps the dream on schedule.
- Director of Photography (DP): owns the image — camera, lenses, lighting, exposure.
- Gaffer: executes the lighting plan under the DP.
- Sound mixer: records production audio. Bad picture is a style; bad sound is unwatchable.
- Script supervisor: tracks continuity, coverage, and which takes were good — the editor's advocate on set.
- Production designer / art: everything in front of the camera that isn't a person.
- Hair, makeup, wardrobe: continuity of how people look, scene to scene and take to take.
- Editor: assembles the footage. Worth consulting before the shoot — editors know what coverage they never get.

## The three-person set

A common micro-crew split that actually works:

- Person 1 — Director-producer: directs performances, owns the schedule, handles locations and legal, feeds everyone.
- Person 2 — DP-gaffer: camera and lighting, plus props wrangling between setups.
- Person 3 — Sound-everything: boom and mix, plus data wrangling (copying cards), makeup touch-ups, and continuity photos.

The trap in collapsing roles isn't workload — it's that some jobs conflict. The person operating camera cannot also watch continuity. The director acting in their own film needs someone else authorized to say "that take was soft." Assign the checking roles to different people than the doing roles.

## Critical vs. nice-to-have

If a role goes unfilled, know which kind it is. Unfilled critical roles stop the shoot or ruin the footage: sound, safety, someone legally responsible for the location. Unfilled nice-to-have roles just make the day harder: a dedicated gaffer, a props master, craft services. Cast your crew the way you cast actors — critical roles first, with named backups for the people most likely to drop out.

## Write it down

However you split the roles, write the assignments down where the whole team can see them. "I thought you were bringing the release forms" is the most expensive sentence on a small set. A visible role board — every responsibility, every name, gaps highlighted — costs ten minutes and prevents the shoot-day scramble.`,
  },
  {
    slug: "script-breakdown-guide",
    title: "Script Breakdown: From Final Draft to Production Plan",
    description:
      "How to mark up a locked script to extract every location, character, prop, and requirement before you schedule a single day.",
    minutes: 7,
    body: `A script breakdown is the systematic read where you stop being a writer and start being a producer: you go through the locked screenplay and pull out every single thing the production must supply. It's how "INT. DINER — NIGHT" becomes a location contract, a lighting plan, six cast calls, and a milkshake that must look identical for nine takes.

## Break down by scene, extract by category

Work one scene at a time and pull out, for each scene:

- Location: from the slug line. INT/EXT matters — exteriors add weather risk and sound problems.
- Time of day: DAY/NIGHT drives your schedule harder than almost anything. Night exteriors are the most expensive thing a small production can write.
- Cast: everyone who appears, not just who speaks. Background counts.
- Props: any object a character handles. If it's handled, it can break — plan a duplicate for anything fragile or consumed.
- Wardrobe and makeup notes: blood, rain-soaked clothes, injuries that must progress realistically across scenes.
- Vehicles, animals, minors, stunts, weapons: each of these is its own planning problem with its own lead time. Flag them loudly.
- Sound: practical music, phone calls the audience hears, anything that can't be fixed later.

## Locations want consolidation

Once every scene is tagged with its location, group them. Five scenes at the diner is one location day, not five separate visits. This grouping — shooting out a location — is the foundation of every real schedule, because moving the crew (a "company move") costs half a day by the time you've wrapped, driven, and re-set.

The same logic applies to cast: an actor in scenes 3, 14, and 22 wants those scenes near each other in the schedule, or you're paying (in money or goodwill) for three separate days.

## Characters: count their workload

Tally how many scenes and how much dialogue each character carries. This tells you casting priority — who needs your strongest, most reliable actor — and rehearsal allocation. It also surfaces script problems early: a character who appears in one scene with two lines might be mergeable with another role, saving you a casting search and a shoot-day dependency.

## The breakdown is a living checklist

The first pass happens when the script locks. But every rewrite changes the breakdown — a scene moved from day to night, a new prop, a location swap. Keep the breakdown connected to the script rather than in a separate spreadsheet that quietly goes stale. Stale breakdowns are how a crew shows up to a location nobody booked.

## From breakdown to schedule

With scenes tagged by location, cast, and time of day, scheduling becomes a sorting problem: group by location, order night work sensibly, respect actor availability, and put the hardest scene of each day in the morning while everyone is fresh. You'll still improvise on the day — but improvising from a plan beats improvising from memory.`,
  },
  {
    slug: "shoot-day-survival",
    title: "Running Your First Shoot Day: A Survival Guide",
    description:
      "The order of operations for a smooth shoot day — from first arrival to wrapping the location — and what to do when it goes sideways.",
    minutes: 7,
    body: `No shoot day goes to plan. Good productions aren't the ones without problems — they're the ones where problems don't cascade. This is the order of operations that keeps a small set moving.

## Before anyone else arrives

Whoever runs the day arrives first, opens the location, and walks it: where does gear stage, where do actors wait, where's the bathroom, what's the noise situation. Ten minutes alone in the space answers the questions the whole crew will otherwise ask you one by one.

## The first hour

- Gear in and staged — not set up, staged. One pile, organized.
- First setup starts immediately: the DP lights the first scene while actors get through makeup and wardrobe.
- Safety and orientation in two minutes flat: exits, hazards, hospital, who has the first-aid kit.
- Rehearse the first scene on its feet while lighting finishes.

The first shot of the day sets the tempo. A set that gets shot one off within an hour of call believes the schedule; a set that's still lighting at noon has silently given up on it.

## Protect the rhythm

The cycle is: rehearse, tweak, shoot, check, move on. The two places days die:

- Perfectionism on early setups: five extra takes on the wide costs you the close-up that actually carries the scene. Shoot to plan; upgrade only when ahead.
- Slow transitions between setups: announce the next setup before the current one wraps, so grip and lighting start moving on "cut."

Track progress against the shot list, visibly, so everyone can see the day's reality. When you fall behind, don't cut coverage of the emotional beats — cut redundant angles of connecting material.

## When it goes sideways

- Location falls through: shoot what doesn't need it, move the location-dependent scenes to a pickup day. Never wait around "in case it opens up."
- Actor is late or sick: reorder around them. This is why every shot is tagged with cast — you can instantly see what's shootable without them.
- Weather kills an exterior: swap in a cover set — the interior scene you deliberately kept unshot as insurance. No cover set planned is a rookie mistake you make once.
- Light is fading: grab the wide and the key close-up. Two usable shots beat five half-lit ones.

## Wrapping is part of the day

The shoot isn't over when the last take is called. Cards get backed up to two drives before anyone leaves — footage that exists in one place doesn't exist. The location is restored to better than you found it (you may need it for reshoots, and your reputation shoots more days than your camera does). And the next day's call sheet goes out before everyone scatters.

## The morning-after review

Within a day, watch the footage — not to admire it, to audit it. Missing inserts, a scene that doesn't cut, a boom in frame: all fixable now with a 30-minute pickup, all expensive to fix in three weeks when the location is repainted and the actor cut their hair.`,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
