import type { WorkCreditRole } from "@/types/credits";
import type { CreditsRollWork } from "@/types/creditsRoll";
import type { ProfileRoleTag } from "@/types/portfolio";

/**
 * OONA's made-up world: a hundred people over forty works, with schools,
 * stills, a few synopses and a few notes on what someone did on a work, for
 * the in-app demo (society-demo.ts) to show.
 *
 * Names and schools are invented, and American: the demo is shown to an
 * American audience, so everything in it reads in English. Data only, with
 * type-only imports.
 */

/** Invented, like the people, and American, like the demo's audience. */
export const DEMO_SCHOOLS = {
  riverside: "Riverside Film Academy",
  northlight: "Northlight College",
  harborline: "Harborline School of the Arts",
  cedar: "Cedar Hill Conservatory",
  bayard: "Bayard College of Media Arts",
  westbrook: "Westbrook Film School",
  lakeshore: "Lakeshore Media University",
  sierra: "Sierra Vista Arts College",
  pinecrest: "Pinecrest Arts University",
  redwood: "Redwood Film Institute",
  silverlake: "Silver Lake University of the Arts",
  fenmark: "Fenmark Institute of Film",
} as const;

export type DemoPerson = { id: string; name: string; tags: ProfileRoleTag[]; open?: boolean; headline: string; bio: string };

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: "lena", name: "Lena Brandt", tags: ["director"], open: true, headline: "Director", bio: "Quiet films about loud families. Low Tide was shot in one night with a crew of six." },
  { id: "hannah", name: "Hannah Brooks", tags: ["crew"], headline: "Cinematographer", bio: "I live for the ten minutes before the light goes." },
  { id: "tomas", name: "Tomás Reyes", tags: ["crew"], headline: "Sound recordist", bio: "I collect rooms: the hum of every place we shoot." },
  { id: "ines", name: "Inês Duarte", tags: ["actor"], headline: "Actor", bio: "Theater first, camera second, always curious." },
  { id: "julia", name: "Julia Bennett", tags: ["director"], headline: "Director", bio: "Stories about islands: the people who leave and the ones who stay." },
  { id: "ryan", name: "Ryan Parker", tags: ["actor"], headline: "Actor", bio: "I like characters who say less than they mean." },
  { id: "ethan", name: "Ethan Cole", tags: ["crew"], headline: "Gaffer", bio: "One small lamp can change a whole scene." },
  { id: "megan", name: "Megan Ross", tags: ["crew"], open: true, headline: "Editor", bio: "I listen for the breath between cuts." },
  { id: "emily", name: "Emily Carter", tags: ["actor"], headline: "Actor", bio: "Six shorts, two plays." },
  { id: "molly", name: "Molly Spencer", tags: ["director"], headline: "Writer · Director", bio: "Somehow every story I write happens in the rain." },
  { id: "kevin", name: "Kevin Doyle", tags: ["crew"], headline: "Editor", bio: "I like a cut that tells the story through rhythm." },
  { id: "allison", name: "Allison Kerr", tags: ["actor"], open: true, headline: "Actor", bio: "Voice work and film, both." },
  { id: "noor", name: "Noor Haddad", tags: ["director"], headline: "Director · Producer", bio: "Gardens, glass, and the people who look after them." },
  { id: "ruth", name: "Ruth Abebe", tags: ["crew"], headline: "Sound designer", bio: "Silence is a sound too." },
  { id: "amara", name: "Amara Okafor", tags: ["actor"], headline: "Actor", bio: "Comedy on weekends, drama on weekdays." },
  { id: "leo", name: "Leo Martins", tags: ["crew"], open: true, headline: "Cinematographer", bio: "16mm whenever I can get it." },
  { id: "sam", name: "Sam Whitaker", tags: ["director"], headline: "Director", bio: "Road movies on a student budget." },
  { id: "theo", name: "Theo Laurent", tags: ["actor"], headline: "Actor", bio: "French, English, and learning Spanish." },
  { id: "marcus", name: "Marcus Bell", tags: ["crew"], headline: "Boom op · Sound", bio: "Ask me about wind." },
  { id: "priya", name: "Priya Nair", tags: ["crew"], headline: "Producer", bio: "Schedules, budgets, and a lot of snacks." },
  { id: "kai", name: "Kai Fujimoto", tags: ["crew"], headline: "Gaffer", bio: "Night exteriors are my favorite problem." },
  { id: "rachel", name: "Rachel Simmons", tags: ["director"], open: true, headline: "Director", bio: "About the things that bloom in the cracks of a city." },
  { id: "chloe", name: "Chloe Adams", tags: ["actor"], open: true, headline: "Actor", bio: "Always up for an audition." },
  { id: "hailey", name: "Hailey Morgan", tags: ["director"], headline: "Screenwriter", bio: "Practicing taking lines out." },
  { id: "daniel", name: "Daniel Fox", tags: ["director"], headline: "Director · Writer", bio: "First drafts are the honest ones." },
  { id: "zoe", name: "Zoe Marshall", tags: ["actor"], headline: "Actor", bio: "Musicals, shorts, and one very strange commercial." },
  { id: "rafael", name: "Rafael Costa", tags: ["director"], headline: "Screenwriter", bio: "Writing in three languages, badly in all of them." },
  { id: "omar", name: "Omar Saleh", tags: ["actor"], open: true, headline: "Actor", bio: "Looking for a feature this summer." },
  { id: "grace", name: "Grace Holloway", tags: ["director"], headline: "Director", bio: "Music videos and short documentaries." },
  { id: "yusuf", name: "Yusuf Demir", tags: ["crew"], headline: "Camera", bio: "Handheld or nothing." },
  { id: "natalie", name: "Natalie Hayes", tags: ["director"], headline: "Director", bio: "I film things that flicker." },
  { id: "hugo", name: "Hugo Silva", tags: ["crew"], headline: "Editor · Colorist", bio: "Teal and orange is not a personality." },
  { id: "mei", name: "Mei Lin", tags: ["director"], headline: "Director", bio: "Small towns, long takes." },
  { id: "arjun", name: "Arjun Rao", tags: ["actor"], headline: "Actor", bio: "Stage combat certified." },
  { id: "clara", name: "Clara Weiss", tags: ["crew"], headline: "Sound", bio: "Field recordings from twelve countries." },
  { id: "jake", name: "Jake Turner", tags: ["crew"], open: true, headline: "Camera", bio: "In love with long takes." },
  { id: "sora", name: "Stella Tanner", tags: [], headline: "", bio: "" },
  { id: "ava", name: "Ava Mitchell", tags: ["actor"], headline: "Aspiring actor", bio: "Looking for my first project." },
  { id: "ivy", name: "Ivy Chen", tags: ["crew"], headline: "Production design", bio: "Tiny sets, big worlds." },

  { id: "elena", name: "Elena Marsh", tags: ["director"], headline: "Director", bio: "I keep remaking the same walk home." },
  { id: "dev", name: "Dev Patel-Shaw", tags: ["crew"], headline: "Key grip", bio: "If it moves, I built the thing it moves on." },
  { id: "naomi", name: "Naomi Oyelaran", tags: ["actor"], open: true, headline: "Actor", bio: "Two years of stage, first year on camera." },
  { id: "felix", name: "Felix Brenner", tags: ["crew"], headline: "Editor", bio: "I cut on the breath, not the beat." },
  { id: "cora", name: "Cora Nilsen", tags: ["director"], headline: "Director", bio: "Winter light, mostly. It only lasts an hour up there." },
  { id: "jonah", name: "Jonah Reed", tags: ["crew"], headline: "Production sound", bio: "Bring a coat; we're recording outside." },
  { id: "maya", name: "Maya Thornton", tags: ["actor"], headline: "Actor", bio: "I like scripts where nobody explains themselves." },
  { id: "silas", name: "Silas Okonkwo", tags: ["crew"], open: true, headline: "Cinematographer", bio: "Available weekends. Own glass, no car." },
  { id: "tess", name: "Tess Varga", tags: ["crew"], headline: "Producer", bio: "I find the location nobody thought to ask about." },
  { id: "rowan", name: "Rowan Hale", tags: ["director"], headline: "Director · Writer", bio: "Half my films are about brothers. I only have sisters." },
  { id: "bea", name: "Bea Lindqvist", tags: ["actor"], headline: "Actor", bio: "Swedish, English, and a passable Boston accent." },
  { id: "caleb", name: "Caleb Ruiz", tags: ["crew"], headline: "Gaffer", bio: "Practicals in frame, always." },
  { id: "nina", name: "Nina Ferreira", tags: ["director"], open: true, headline: "Director", bio: "Documentary habits in fiction films." },
  { id: "otto", name: "Otto Wenzel", tags: ["crew"], headline: "Colorist", bio: "I will talk you out of the green shadows." },
  { id: "lucia", name: "Lucía Moreno", tags: ["actor"], headline: "Actor", bio: "Grew up in a theater. Still smells like home." },
  { id: "aminata", name: "Aminata Diallo", tags: ["director"], headline: "Director", bio: "Three generations in one kitchen, usually." },
  { id: "esme", name: "Esmé Chaput", tags: ["crew"], headline: "Costume", bio: "Clothes as the first line of dialogue." },
  { id: "vikram", name: "Vikram Shenoy", tags: ["crew"], headline: "VFX · Compositing", bio: "The best effect is the one nobody notices." },
  { id: "paloma", name: "Paloma Reyes", tags: ["actor"], open: true, headline: "Actor", bio: "Looking for something with teeth." },
  { id: "gus", name: "Gus Albright", tags: ["crew"], headline: "Sound mixer", bio: "Twelve years of bad room tone has made me patient." },
  { id: "iris", name: "Iris Nolan", tags: ["director"], headline: "Director", bio: "Short films about long drives." },
  { id: "ned", name: "Ned Harlow", tags: ["actor"], headline: "Actor", bio: "Character parts. Happy to be the neighbor." },
  { id: "sofia", name: "Sofia Bianchi", tags: ["crew"], headline: "Art director", bio: "I build the room, then take half of it out." },
  { id: "tariq", name: "Tariq Mansour", tags: ["crew"], open: true, headline: "Cinematographer", bio: "Available from June. Ask about the night stuff." },
  { id: "wren", name: "Wren Delacroix", tags: ["crew"], headline: "Editor", bio: "The scene is over before you think it is." },
  { id: "bram", name: "Bram de Vries", tags: ["director"], headline: "Director", bio: "Flat country, wide lenses." },
  { id: "adaeze", name: "Adaeze Nwosu", tags: ["actor"], headline: "Actor", bio: "I did a year of radio drama and it ruined me for mumbling." },
  { id: "kostas", name: "Kostas Alexiou", tags: ["crew"], headline: "Boom · Sound", bio: "Cicadas are louder than you remember." },
  { id: "mira", name: "Mira Solberg", tags: ["director"], open: true, headline: "Director", bio: "Looking for a producer who likes boats." },
  { id: "quinn", name: "Quinn Rafferty", tags: [], headline: "", bio: "" },

  { id: "justin", name: "Justin Ward", tags: ["director"], headline: "Director", bio: "I film old buildings before they come down." },
  { id: "sophie", name: "Sophie Collins", tags: ["actor"], open: true, headline: "Actor", bio: "Short or feature, I'll go where the good scripts are." },
  { id: "tyler", name: "Tyler Grant", tags: ["crew"], headline: "Cinematographer", bio: "Four a.m. is my favorite color." },
  { id: "brooke", name: "Brooke Foster", tags: ["crew"], headline: "Editor", bio: "I look at what to take out before what to add." },
  { id: "garrett", name: "Garrett Lane", tags: ["crew"], headline: "Sound", bio: "Production sound is half the film." },
  { id: "sean", name: "Sean Murphy", tags: ["actor"], headline: "Actor", bio: "Seven plays, four shorts." },
  { id: "derek", name: "Derek Wallace", tags: ["director"], headline: "Director", bio: "Working out how to film family stories without the family." },
  { id: "kayla", name: "Kayla Price", tags: ["actor"], open: true, headline: "Actor", bio: "I can do comedy too. Really." },
  { id: "mason", name: "Mason Hughes", tags: ["crew"], headline: "Lighting", bio: "I design the shadows first." },
  { id: "abby", name: "Abby Coleman", tags: ["crew"], headline: "Producer", bio: "Budget sheet in one hand, the lunch order in the other." },
  { id: "jordan", name: "Jordan Blake", tags: ["director"], headline: "Director · Writer", bio: "I write scenes that end in three lines." },
  { id: "lauren", name: "Lauren Fisher", tags: ["actor"], headline: "Actor", bio: "Working on acting with my eyes." },
  { id: "wyatt", name: "Wyatt Jensen", tags: ["crew"], open: true, headline: "Cinematographer", bio: "I can hold a handheld shot all day." },
  { id: "dana", name: "Dana Whitfield", tags: ["crew"], headline: "Production design", bio: "I want one room to explain a character." },
  { id: "scott", name: "Scott Duncan", tags: ["actor"], headline: "Actor", bio: "Three regional accents, on request." },
  { id: "erin", name: "Erin Walsh", tags: ["director"], headline: "Director", bio: "I like shooting near water." },
  { id: "gwen", name: "Gwen Harper", tags: ["crew"], headline: "Editor · Colorist", bio: "Will argue about the length of a cut for hours." },
  { id: "hunter", name: "Hunter Ellis", tags: ["actor"], headline: "Actor", bio: "Moving from the stage to the screen." },
  { id: "sarah", name: "Sarah Lowe", tags: [], headline: "", bio: "" },

  { id: "ben", name: "Ben Carver", tags: ["director"], headline: "Director", bio: "I mostly film towns after the last train." },
  { id: "claire", name: "Claire Donovan", tags: ["actor"], open: true, headline: "Actor", bio: "I want to keep doing both stage and film." },
  { id: "dylan", name: "Dylan Pierce", tags: ["crew"], headline: "Cinematographer", bio: "I care about how a long take breathes." },
  { id: "jenna", name: "Jenna Holt", tags: ["crew"], headline: "Editor", bio: "I build the cut from the sound first." },
  { id: "henry", name: "Henry Caldwell", tags: ["actor"], headline: "Actor", bio: "I like roles with very few lines." },
  { id: "nora", name: "Nora Fitzgerald", tags: ["director"], headline: "Director · Writer", bio: "I keep reshooting the family dinner table." },
  { id: "cody", name: "Cody Larson", tags: ["crew"], headline: "Lighting", bio: "Give me a night exterior any day." },
  { id: "lily", name: "Lily Hart", tags: ["actor"], open: true, headline: "Actor", bio: "Auditions welcome, any kind of set." },
  { id: "travis", name: "Travis Boone", tags: ["crew"], headline: "Sound recordist", bio: "Room tone is my love language." },
  { id: "paige", name: "Paige Sanders", tags: ["crew"], headline: "Production coordinator", bio: "In charge of the schedule and the sandwiches." },
  { id: "katie", name: "Katie Moran", tags: ["director"], headline: "Director", bio: "Some stories can only be shot by the ocean." },
  { id: "luke", name: "Luke Harrison", tags: ["actor"], headline: "Actor", bio: "Trained in fight choreography. Ask for the reel." },
  { id: "kyle", name: "Kyle Benson", tags: [], headline: "", bio: "" },
];

/**
 * Frames for the works, from the photographs the app already ships. The small
 * files under images/home/{featured,selects,surface} look like they belong
 * here by their names, but they are captures of the catalogue UI — title text
 * and neighbouring cards baked in, 233px wide — so they are not stills.
 */
export const DEMO_STILLS = {
  crewAtSea: "/images/demo/crew-at-sea.webp",
  rooftopCity: "/images/demo/rooftop-city.webp",
  lighthouse: "/images/demo/lighthouse.webp",
  studio: "/images/hero/show-catalog-v1.png",
  kitchen: "/images/show/show-cooking-v1.jpg",
  arcade: "/images/show/show-game-v1.jpg",
  livingRoom: "/images/show/show-house-v1.jpg",
  stage: "/images/show/show-music-v1.jpg",
  outdoors: "/images/show/show-outdoor-v1.jpg",
  talkSet: "/images/show/show-talk-v1.jpg",
  cityLights: "/images/schools/oona-land-terrain-v2.jpg",
  starfield: "/images/schools/oona-society-land-v3.jpg",
  portalNight: "/images/home/home_portal_night_photo.jpg",
  portalRocks: "/images/home/home-rocks-extension-v1.png",
  portalWide: "/images/home/home_main_wave6.png",
  underwater: "/images/hero/home-under-water.png",
  underwaterRays: "/images/hero/home_under_water_1.jpeg",
  wave: "/images/hero/home-wave.png",
  waveNight: "/images/home-wave1.png",
  swell1: "/images/hero/campus-wave1.png",
  swell2: "/images/hero/campus-wave2.png",
  swell3: "/images/hero/campus-wave3.png",
  shoreline: "/images/hero-landscape.webp",
} as const;

export type DemoCredit = [id: string, role: WorkCreditRole, character?: string];
export type DemoWork = { id: string; title: string; still: string; school: string; date: string; section: CreditsRollWork["section"]; crew: DemoCredit[] };

export const DEMO_WORKS: DemoWork[] = [
  // Each made by people of its own, so the sky has room for them all…
  { id: "low-tide", title: "Low Tide", still: DEMO_STILLS.crewAtSea, school: DEMO_SCHOOLS.riverside, date: "2026-10-12", section: "movies", crew: [["lena", "director"], ["hannah", "cinematography"], ["tomas", "sound"], ["ines", "actor", "Mara"]] },
  { id: "midnight-ferry", title: "Midnight Ferry", still: DEMO_STILLS.underwaterRays, school: DEMO_SCHOOLS.westbrook, date: "2026-10-09", section: "movies", crew: [["julia", "director"], ["ryan", "actor", "Miles"], ["emily", "actor", "Sadie"], ["ethan", "lighting"], ["megan", "edit"]] },
  { id: "paper-moon", title: "Paper Moon", still: DEMO_STILLS.lighthouse, school: DEMO_SCHOOLS.pinecrest, date: "2026-10-05", section: "movies", crew: [["molly", "writer"], ["kevin", "edit"], ["allison", "actor", "Wendy"]] },
  { id: "glass-garden", title: "Glass Garden", still: DEMO_STILLS.swell1, school: DEMO_SCHOOLS.northlight, date: "2026-09-28", section: "movies", crew: [["noor", "director"], ["ruth", "sound"], ["amara", "actor", "Iris"], ["leo", "cinematography"]] },
  { id: "northbound", title: "Northbound", still: DEMO_STILLS.portalNight, school: DEMO_SCHOOLS.riverside, date: "2026-09-21", section: "movies", crew: [["sam", "director"], ["theo", "actor", "Jules"], ["marcus", "sound"], ["priya", "production"], ["kai", "lighting"]] },
  { id: "concrete-bloom", title: "Concrete Bloom", still: DEMO_STILLS.livingRoom, school: DEMO_SCHOOLS.westbrook, date: "2026-09-14", section: "entertainment", crew: [["rachel", "director"], ["chloe", "actor", "Daisy"], ["hailey", "writer"], ["ivy", "other"]] },
  { id: "first-draft", title: "The First Draft", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.northlight, date: "2026-09-02", section: "movies", crew: [["daniel", "director"], ["zoe", "actor", "Ellie"], ["rafael", "writer"], ["lena", "edit"]] },
  { id: "rooftop-sound", title: "Rooftop Sound", still: DEMO_STILLS.stage, school: DEMO_SCHOOLS.riverside, date: "2026-08-25", section: "entertainment", crew: [["grace", "director"], ["omar", "actor", "Sami"], ["yusuf", "cinematography"], ["lena", "edit"]] },
  { id: "flicker", title: "Flicker", still: DEMO_STILLS.wave, school: DEMO_SCHOOLS.westbrook, date: "2026-08-17", section: "movies", crew: [["natalie", "director"], ["hugo", "edit"], ["lena", "cinematography"]] },
  { id: "distant-land", title: "Distant Land", still: DEMO_STILLS.cityLights, school: DEMO_SCHOOLS.pinecrest, date: "2026-08-08", section: "movies", crew: [["mei", "director"], ["arjun", "actor", "Dev"], ["clara", "sound"], ["jake", "cinematography"]] },
  // …and a few that share someone with those, so the twigs lead on.
  { id: "almost-maine", title: "Almost Maine", still: DEMO_STILLS.swell2, school: DEMO_SCHOOLS.northlight, date: "2026-07-30", section: "movies", crew: [["lena", "writer"], ["ryan", "actor", "Jesse"], ["leo", "cinematography"]] },
  { id: "sink-or-swim", title: "Sink or Swim", still: DEMO_STILLS.underwater, school: DEMO_SCHOOLS.westbrook, date: "2026-07-21", section: "movies", crew: [["julia", "director"], ["omar", "actor", "Sami"], ["hannah", "cinematography"]] },
  { id: "everything-somewhere", title: "Everything Somewhere", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.pinecrest, date: "2026-07-12", section: "entertainment", crew: [["allison", "actor", "Rose"], ["theo", "actor", "Max"], ["kevin", "edit"], ["noor", "production"]] },
  { id: "basement-show", title: "Basement Show", still: DEMO_STILLS.arcade, school: DEMO_SCHOOLS.westbrook, date: "2026-07-03", section: "entertainment", crew: [["daniel", "director"], ["chloe", "actor", "Maddie"], ["ethan", "lighting"]] },
  { id: "late-show", title: "Late Show", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.riverside, date: "2026-06-20", section: "entertainment", crew: [["amara", "actor"], ["sam", "director"]] },

  // Series, shorts and the rest of the shows, so every section has something.
  { id: "nine-pm", title: "9 PM Conversation", still: DEMO_STILLS.studio, school: DEMO_SCHOOLS.harborline, date: "2026-06-11", section: "entertainment", crew: [["elena", "director"], ["naomi", "actor", "Ada"], ["ned", "actor", "Walter"], ["gus", "sound"], ["tess", "production"]] },
  { id: "share-house", title: "Share House", still: DEMO_STILLS.livingRoom, school: DEMO_SCHOOLS.lakeshore, date: "2026-06-02", section: "series", crew: [["justin", "director"], ["sophie", "actor", "Ruby"], ["scott", "actor", "Jason"], ["tyler", "cinematography"], ["abby", "production"], ["dana", "other"]] },
  { id: "kitchen-light", title: "Kitchen Light", still: DEMO_STILLS.kitchen, school: DEMO_SCHOOLS.sierra, date: "2026-05-24", section: "entertainment", crew: [["derek", "director"], ["kayla", "actor", "Mia"], ["garrett", "sound"], ["brooke", "edit"]] },
  { id: "the-run", title: "The Run", still: DEMO_STILLS.arcade, school: DEMO_SCHOOLS.cedar, date: "2026-05-15", section: "entertainment", crew: [["rowan", "director"], ["paloma", "actor", "Vera"], ["dev", "other"], ["caleb", "lighting"], ["wren", "edit"]] },
  { id: "field-trip", title: "Field Trip", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.silverlake, date: "2026-05-06", section: "entertainment", crew: [["nora", "director"], ["henry", "actor", "Owen"], ["claire", "actor", "Holly"], ["cody", "lighting"], ["paige", "production"]] },
  { id: "campus-hours", title: "Campus Hours", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.bayard, date: "2026-04-27", section: "series", crew: [["nina", "director"], ["maya", "actor", "Juno"], ["bea", "actor", "Pia"], ["silas", "cinematography"], ["esme", "other"], ["jonah", "sound"]] },
  { id: "salt-and-tide", title: "Salt and Tide", still: DEMO_STILLS.shoreline, school: DEMO_SCHOOLS.fenmark, date: "2026-04-18", section: "movies", crew: [["mira", "director"], ["lucia", "actor", "Carmen"], ["tariq", "cinematography"], ["kostas", "sound"], ["sofia", "other"]] },
  { id: "the-long-walk-home", title: "The Long Walk Home", still: DEMO_STILLS.swell3, school: DEMO_SCHOOLS.harborline, date: "2026-04-09", section: "movies", crew: [["elena", "director"], ["adaeze", "actor", "Nkechi"], ["felix", "edit"], ["otto", "other"], ["jonah", "sound"]] },
  { id: "after-rain", title: "After Rain", still: DEMO_STILLS.swell3, school: DEMO_SCHOOLS.redwood, date: "2026-03-31", section: "shorts", crew: [["katie", "director"], ["lily", "actor", "Sienna"], ["dylan", "cinematography"]] },
  { id: "breath-hold", title: "Breath Hold", still: DEMO_STILLS.underwater, school: DEMO_SCHOOLS.pinecrest, date: "2026-03-22", section: "shorts", crew: [["ben", "director"], ["luke", "actor", "Nate"], ["travis", "sound"], ["jenna", "edit"]] },
  { id: "the-swell", title: "The Swell", still: DEMO_STILLS.waveNight, school: DEMO_SCHOOLS.fenmark, date: "2026-03-13", section: "movies", crew: [["bram", "director"], ["ned", "actor", "Pieter"], ["tariq", "cinematography"], ["vikram", "other"], ["tess", "production"]] },
  { id: "undertow", title: "Undertow", still: DEMO_STILLS.portalWide, school: DEMO_SCHOOLS.riverside, date: "2026-03-04", section: "movies", crew: [["cora", "director"], ["bea", "actor", "Ingrid"], ["silas", "cinematography"], ["gus", "sound"], ["wren", "edit"], ["dev", "other"]] },
  { id: "night-shift", title: "Night Shift", still: DEMO_STILLS.cityLights, school: DEMO_SCHOOLS.lakeshore, date: "2026-02-23", section: "series", crew: [["jordan", "director"], ["lauren", "actor", "Sue"], ["sean", "actor", "Tom"], ["wyatt", "cinematography"], ["mason", "lighting"], ["gwen", "edit"]] },
  { id: "terrain", title: "Terrain", still: DEMO_STILLS.starfield, school: DEMO_SCHOOLS.cedar, date: "2026-02-14", section: "shorts", crew: [["iris", "director"], ["naomi", "actor", "Bess"], ["caleb", "lighting"]] },
  { id: "island-season", title: "Island Season", still: DEMO_STILLS.shoreline, school: DEMO_SCHOOLS.sierra, date: "2026-02-05", section: "series", crew: [["erin", "director"], ["hunter", "actor", "Jill"], ["kayla", "actor", "Bonnie"], ["tyler", "cinematography"], ["abby", "production"]] },
  { id: "beyond-the-surface", title: "Beyond the Surface", still: DEMO_STILLS.underwaterRays, school: DEMO_SCHOOLS.silverlake, date: "2026-01-27", section: "shorts", crew: [["nora", "director"], ["claire", "actor", "April"], ["jenna", "edit"]] },
  { id: "the-reading", title: "The Reading", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.bayard, date: "2026-01-18", section: "shorts", crew: [["aminata", "director"], ["adaeze", "actor", "Zainab"], ["lucia", "actor", "Pilar"], ["kostas", "sound"]] },
  { id: "two-rooms", title: "Two Rooms", still: DEMO_STILLS.portalRocks, school: DEMO_SCHOOLS.northlight, date: "2026-01-09", section: "movies", crew: [["rowan", "director"], ["maya", "actor", "Edie"], ["felix", "edit"], ["sofia", "other"], ["priya", "production"]] },
  { id: "last-bus", title: "Last Bus", still: DEMO_STILLS.waveNight, school: DEMO_SCHOOLS.westbrook, date: "2025-12-29", section: "shorts", crew: [["natalie", "director"], ["sophie", "actor", "Harper"], ["garrett", "sound"]] },
  { id: "groundwork", title: "Groundwork", still: DEMO_STILLS.starfield, school: DEMO_SCHOOLS.harborline, date: "2025-12-18", section: "movies", crew: [["cora", "director"], ["ned", "actor", "Sol"], ["dev", "other"], ["otto", "other"], ["jonah", "sound"], ["esme", "other"]] },
  { id: "open-call", title: "Open Call", still: DEMO_STILLS.studio, school: DEMO_SCHOOLS.riverside, date: "2025-12-07", section: "entertainment", crew: [["grace", "director"], ["paloma", "actor"], ["ava", "actor"], ["naomi", "actor"], ["tess", "production"]] },
  { id: "the-quiet-part", title: "The Quiet Part", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.redwood, date: "2025-11-26", section: "movies", crew: [["ben", "director"], ["henry", "actor", "Eli"], ["dylan", "cinematography"], ["travis", "sound"], ["cody", "lighting"]] },
  { id: "seventh-floor", title: "Seventh Floor", still: DEMO_STILLS.portalRocks, school: DEMO_SCHOOLS.lakeshore, date: "2025-11-15", section: "series", crew: [["justin", "director"], ["scott", "actor", "Kenny"], ["lauren", "actor", "Sloane"], ["wyatt", "cinematography"], ["dana", "other"], ["brooke", "edit"]] },
  { id: "summer-intern", title: "Summer Intern", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.cedar, date: "2025-11-04", section: "series", crew: [["iris", "director"], ["bea", "actor", "Hollie"], ["arjun", "actor", "Ravi"], ["wren", "edit"], ["caleb", "lighting"]] },
  { id: "one-more-take", title: "One More Take", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.fenmark, date: "2025-10-24", section: "entertainment", crew: [["mira", "director"], ["zoe", "actor"], ["luke", "actor"], ["vikram", "other"], ["gus", "sound"]] },
];

/** A few works say what they're about, and a few people what they did on them, so the demo portfolio shows both. */
export const DEMO_SYNOPSES: Record<string, string> = {
  "low-tide": "Two sisters wait out a storm in their late mother's house by the sea.",
  "almost-maine": "A night of small miracles in a town that isn't on any map.",
  "midnight-ferry": "The last boat of the night, and everyone on it is running from something.",
  "sink-or-swim": "A swimmer who stopped racing comes back to the pool she grew up in.",
};
export const DEMO_NOTES: Record<string, string> = {
  "lena:low-tide": "My first film as director. We had one night and one house, so every shot was planned around the tide.",
  "lena:almost-maine": "I wrote it over a winter, scene by scene, for the actors who ended up playing it.",
  "ryan:midnight-ferry": "Miles barely speaks. I spent the shoot learning to act with my hands.",
  "julia:midnight-ferry": "Shot on a real ferry, three crossings a night for a week.",
};
