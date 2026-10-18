import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { DEMO_HANDLE_PREFIX, DEMO_OWNER, DEMO_SOCIETY_HREF } from "@/lib/demo-flags";
import { hashString } from "@/lib/society-sky";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { WorkCreditRole } from "@/types/credits";
import type { CreditsRollWork } from "@/types/creditsRoll";
import type { ProfileRoleTag } from "@/types/portfolio";
// Stills that live beside the app rather than in public/: imported for their URLs.
import discoverHero from "../../discover_hero.webp";
import filmHero from "../../film_hero.webp";
import homeHero from "../../home_hero.webp";

/**
 * Made-up people and works for Society's demo (/society?demo=1): enough to
 * fill the sky, with some people in two works so the neurons' twigs lead
 * somewhere. Names and schools are invented; nothing here is saved anywhere.
 */

type DemoPerson = { id: string; name: string; tags: ProfileRoleTag[]; open?: boolean; headline: string; bio: string };

const PEOPLE: DemoPerson[] = [
  { id: "lena", name: "Lena Brandt", tags: ["director"], open: true, headline: "Director", bio: "Quiet films about loud families. Low Tide was shot in one night with a crew of six." },
  { id: "haneul", name: "김하늘", tags: ["crew"], headline: "촬영감독", bio: "빛이 사라지기 직전의 10분을 좋아해요." },
  { id: "tomas", name: "Tomás Reyes", tags: ["crew"], headline: "Sound recordist", bio: "I collect rooms: the hum of every place we shoot." },
  { id: "ines", name: "Inês Duarte", tags: ["actor"], headline: "Actor", bio: "Theatre first, camera second, always curious." },
  { id: "yuna", name: "최유나", tags: ["director"], headline: "연출", bio: "바다와 섬, 떠나는 사람과 남는 사람의 이야기를 만듭니다." },
  { id: "park", name: "박윤수", tags: ["actor"], headline: "배우", bio: "말보다 침묵이 많은 인물을 좋아합니다." },
  { id: "seojun", name: "정서준", tags: ["crew"], headline: "조명", bio: "작은 램프 하나로 장면을 바꾸는 걸 좋아해요." },
  { id: "minji", name: "오민지", tags: ["crew"], open: true, headline: "편집", bio: "컷과 컷 사이의 숨을 고릅니다." },
  { id: "eunseo", name: "송은서", tags: ["actor"], headline: "배우", bio: "단편 여섯 편, 연극 두 편." },
  { id: "mio", name: "佐藤 澪", tags: ["director"], headline: "脚本・監督", bio: "雨の日の物語ばかり書いています。" },
  { id: "kenji", name: "中村 健司", tags: ["crew"], headline: "編集", bio: "リズムで語る編集が好きです。" },
  { id: "aiko", name: "森 愛子", tags: ["actor"], open: true, headline: "俳優", bio: "声の仕事と映画の両方をしています。" },
  { id: "noor", name: "Noor Haddad", tags: ["director"], headline: "Director · Producer", bio: "Gardens, glass, and the people who look after them." },
  { id: "ruth", name: "Ruth Abebe", tags: ["crew"], headline: "Sound designer", bio: "Silence is a sound too." },
  { id: "amara", name: "Amara Okafor", tags: ["actor"], headline: "Actor", bio: "Comedy on weekends, drama on weekdays." },
  { id: "leo", name: "Leo Martins", tags: ["crew"], open: true, headline: "Cinematographer", bio: "16mm whenever I can get it." },
  { id: "sam", name: "Sam Whitaker", tags: ["director"], headline: "Director", bio: "Road movies on a student budget." },
  { id: "theo", name: "Theo Laurent", tags: ["actor"], headline: "Actor", bio: "French, Korean, and learning Japanese." },
  { id: "marcus", name: "Marcus Bell", tags: ["crew"], headline: "Boom op · Sound", bio: "Ask me about wind." },
  { id: "priya", name: "Priya Nair", tags: ["crew"], headline: "Producer", bio: "Schedules, budgets, and a lot of snacks." },
  { id: "kai", name: "Kai Fujimoto", tags: ["crew"], headline: "Gaffer", bio: "Night exteriors are my favourite problem." },
  { id: "yerin", name: "윤예린", tags: ["director"], open: true, headline: "감독", bio: "도시의 틈에서 피는 것들에 대해." },
  { id: "jiwoo", name: "이지우", tags: ["actor"], open: true, headline: "배우", bio: "오디션 언제든 환영해요." },
  { id: "hana", name: "한나", tags: ["director"], headline: "각본", bio: "대사를 빼는 연습을 하고 있어요." },
  { id: "daniel", name: "Daniel Cho", tags: ["director"], headline: "Director · Writer", bio: "First drafts are the honest ones." },
  { id: "zoe", name: "Zoe Park", tags: ["actor"], headline: "Actor", bio: "Musicals, shorts, and one very strange commercial." },
  { id: "rafael", name: "Rafael Costa", tags: ["director"], headline: "Screenwriter", bio: "Writing in three languages, badly in all of them." },
  { id: "omar", name: "Omar Saleh", tags: ["actor"], open: true, headline: "Actor", bio: "Looking for a feature this summer." },
  { id: "grace", name: "Grace Lim", tags: ["director"], headline: "Director", bio: "Music videos and short documentaries." },
  { id: "yusuf", name: "Yusuf Demir", tags: ["crew"], headline: "Camera", bio: "Handheld or nothing." },
  { id: "nari", name: "서나리", tags: ["director"], headline: "감독", bio: "깜빡이는 것들을 찍습니다." },
  { id: "hugo", name: "Hugo Silva", tags: ["crew"], headline: "Editor · Colorist", bio: "Teal and orange is not a personality." },
  { id: "mei", name: "Mei Lin", tags: ["director"], headline: "Director", bio: "Small towns, long takes." },
  { id: "arjun", name: "Arjun Rao", tags: ["actor"], headline: "Actor", bio: "Stage combat certified." },
  { id: "clara", name: "Clara Weiss", tags: ["crew"], headline: "Sound", bio: "Field recordings from twelve countries." },
  { id: "jaehan", name: "한재", tags: ["crew"], open: true, headline: "촬영", bio: "롱테이크를 사랑합니다." },
  { id: "sora", name: "Sora Tanaka", tags: [], headline: "", bio: "" },
  { id: "haeun", name: "강하은", tags: ["actor"], headline: "배우 지망생", bio: "첫 작품을 찾고 있어요." },
  { id: "ivy", name: "Ivy Chen", tags: ["crew"], headline: "Production design", bio: "Tiny sets, big worlds." },
];

type Credit = [id: string, role: WorkCreditRole, character?: string];
type DemoWork = { id: string; title: string; still: string; school: string; date: string; section: CreditsRollWork["section"]; crew: Credit[] };

const WORKS: DemoWork[] = [
  // Each made by people of its own, so the sky has room for them all…
  { id: "low-tide", title: "Low Tide", still: discoverHero.src, school: "Riverside Film Academy", date: "2026-10-12", section: "movies", crew: [["lena", "director"], ["haneul", "cinematography"], ["tomas", "sound"], ["ines", "actor", "Mara"]] },
  { id: "midnight-ferry", title: "Midnight Ferry", still: filmHero.src, school: "Hanbit Film School", date: "2026-10-09", section: "movies", crew: [["yuna", "director"], ["park", "actor", "Minsu"], ["eunseo", "actor", "Sora"], ["seojun", "lighting"], ["minji", "edit"]] },
  { id: "paper-moon", title: "Paper Moon", still: "/images/hero/home_under_water_1.jpeg", school: "Kitakaze Arts University", date: "2026-10-05", section: "movies", crew: [["mio", "writer"], ["kenji", "edit"], ["aiko", "actor", "Yuki"]] },
  { id: "glass-garden", title: "Glass Garden", still: "/images/hero-landscape.webp", school: "Northlight College", date: "2026-09-28", section: "movies", crew: [["noor", "director"], ["ruth", "sound"], ["amara", "actor", "Iris"], ["leo", "cinematography"]] },
  { id: "northbound", title: "Northbound", still: homeHero.src, school: "Riverside Film Academy", date: "2026-09-21", section: "movies", crew: [["sam", "director"], ["theo", "actor", "Jules"], ["marcus", "sound"], ["priya", "production"], ["kai", "lighting"]] },
  { id: "concrete-bloom", title: "Concrete Bloom", still: "/images/show/show-house-v1.jpg", school: "Hanbit Film School", date: "2026-09-14", section: "entertainment", crew: [["yerin", "director"], ["jiwoo", "actor", "Dahye"], ["hana", "writer"], ["ivy", "other"]] },
  { id: "first-draft", title: "The First Draft", still: discoverHero.src, school: "Northlight College", date: "2026-09-02", section: "movies", crew: [["daniel", "director"], ["zoe", "actor", "Ellie"], ["rafael", "writer"]] },
  { id: "rooftop-sound", title: "Rooftop Sound", still: "/images/show/show-music-v1.jpg", school: "Riverside Film Academy", date: "2026-08-25", section: "entertainment", crew: [["grace", "director"], ["omar", "actor", "Sami"], ["yusuf", "cinematography"]] },
  { id: "flicker", title: "Flicker", still: filmHero.src, school: "Hanbit Film School", date: "2026-08-17", section: "movies", crew: [["nari", "director"], ["hugo", "edit"]] },
  { id: "distant-land", title: "Distant Land", still: "/images/hero-landscape.webp", school: "Kitakaze Arts University", date: "2026-08-08", section: "movies", crew: [["mei", "director"], ["arjun", "actor", "Dev"], ["clara", "sound"], ["jaehan", "cinematography"]] },
  // …and a few that share someone with those, so the twigs lead on.
  { id: "almost-maine", title: "Almost Maine", still: homeHero.src, school: "Northlight College", date: "2026-07-30", section: "movies", crew: [["lena", "writer"], ["park", "actor", "Joon"], ["leo", "cinematography"]] },
  { id: "sink-or-swim", title: "Sink or Swim", still: "/images/hero/home_under_water_1.jpeg", school: "Hanbit Film School", date: "2026-07-21", section: "movies", crew: [["yuna", "director"], ["omar", "actor", "Sami"], ["haneul", "cinematography"]] },
  { id: "everything-somewhere", title: "Everything Somewhere", still: "/images/show/show-outdoor-v1.jpg", school: "Kitakaze Arts University", date: "2026-07-12", section: "entertainment", crew: [["aiko", "actor", "Rin"], ["theo", "actor", "Max"], ["kenji", "edit"], ["noor", "production"]] },
  { id: "hongdae-concert", title: "Hongdae Concert", still: "/images/show/show-game-v1.jpg", school: "Hanbit Film School", date: "2026-07-03", section: "entertainment", crew: [["daniel", "director"], ["jiwoo", "actor", "Minji"], ["seojun", "lighting"]] },
  { id: "late-show", title: "Late Show", still: "/images/show/show-talk-v1.jpg", school: "Riverside Film Academy", date: "2026-06-20", section: "entertainment", crew: [["amara", "actor"], ["sam", "director"]] },
];

const uidOf = (id: string) => `${DEMO_HANDLE_PREFIX}${id}`;
const byId = new Map(PEOPLE.map((p) => [p.id, p]));

export function demoSociety(): { people: SocietyPerson[]; works: CreditsRollWork[] } {
  const people: SocietyPerson[] = PEOPLE.map((p) => ({
    uid: uidOf(p.id),
    handle: uidOf(p.id),
    displayName: p.name,
    avatarUrl: null,
    headline: p.headline,
    bio: p.bio,
    roleTags: p.tags,
    openToCollaborate: !!p.open,
    followerCount: hashString(p.id) % 140,
  }));
  const works: CreditsRollWork[] = WORKS.map((w) => ({
    workId: w.id,
    ownerUid: DEMO_OWNER,
    title: w.title,
    section: w.section,
    schoolName: w.school,
    publishedAt: `${w.date}T09:00:00.000Z`,
    stillUrl: w.still,
    previewUrl: null,
    playbackUrl: "",
    credits: w.crew.map(([id, role, character]) => ({
      userId: uidOf(id),
      role,
      displayName: byId.get(id)?.name ?? id,
      ...(character ? { characterName: character } : {}),
      profileHref: `/people/${uidOf(id)}`,
    })),
  }));
  return { people, works };
}

/** A demo person's profile, as /api/people/<handle> would answer for a real one. */
export function demoProfile(handle: string): PeopleProfilePayload | null {
  const id = decodeURIComponent(handle).slice(DEMO_HANDLE_PREFIX.length);
  const person = byId.get(id);
  if (!person) return null;
  const mine = WORKS.flatMap((w) => w.crew.filter(([cid]) => cid === id).map(([, role, character]) => ({ w, role, character })));
  const card = ({ w, role, character }: (typeof mine)[number]) => ({
    workId: w.id,
    ownerUid: DEMO_OWNER,
    title: w.title,
    role,
    ...(character ? { characterName: character } : {}),
    thumbnailUrl: w.still,
    watchPath: DEMO_SOCIETY_HREF,
    collaborators: w.crew
      .filter(([cid]) => cid !== id)
      .map(([cid, crole, ccharacter]) => ({
        uid: uidOf(cid),
        displayName: byId.get(cid)?.name ?? cid,
        role: crole,
        ...(ccharacter ? { characterName: ccharacter } : {}),
        avatarUrl: null,
        profileHref: `/people/${uidOf(cid)}`,
      })),
  });
  const directed = mine.filter((m) => m.role === "director").map(card);
  const credited = mine.filter((m) => m.role !== "director").map(card);
  const h = hashString(id);
  return {
    profile: {
      uid: uidOf(id),
      handle: uidOf(id),
      displayName: person.name,
      avatarUrl: null,
      headline: person.headline,
      bio: person.bio,
      openToCollaborate: !!person.open,
      followerCount: h % 140,
      followingCount: (h >> 8) % 60,
      schoolName: mine[0]?.w.school ?? null,
    },
    stats: { stories: directed.length, totalViews: (h >> 4) % 4000 },
    isOnline: h % 5 === 0,
    viewer: null,
    directed,
    credited,
  };
}
