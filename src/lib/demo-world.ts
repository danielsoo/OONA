import type { WorkCreditRole } from "@/types/credits";
import type { CreditsRollWork } from "@/types/creditsRoll";
import type { ProfileRoleTag } from "@/types/portfolio";

/**
 * OONA's made-up world: a hundred people over forty works, with schools,
 * stills, a few synopses and a few notes on what someone did on a work, for
 * the in-app demo (society-demo.ts) to show.
 *
 * Names and schools are invented. Data only, with type-only imports.
 */

/** Invented, like the people: three regions, so the directory reads as one world. */
export const DEMO_SCHOOLS = {
  riverside: "Riverside Film Academy",
  northlight: "Northlight College",
  harbourline: "Harbourline School of the Arts",
  cedar: "Cedar Hill Conservatory",
  bayard: "Bayard College of Media Arts",
  hanbit: "Hanbit Film School",
  dalbit: "Dalbit Media University",
  seonjae: "Seonjae Arts College",
  kitakaze: "Kitakaze Arts University",
  asagiri: "Asagiri Film Institute",
  minatogawa: "Minatogawa University of the Arts",
  fenmark: "Fenmark Institute of Film",
} as const;

export type DemoPerson = { id: string; name: string; tags: ProfileRoleTag[]; open?: boolean; headline: string; bio: string };

export const DEMO_PEOPLE: DemoPerson[] = [
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
  { id: "bea", name: "Bea Lindqvist", tags: ["actor"], headline: "Actor", bio: "Swedish, English, and a passable Glasgow accent." },
  { id: "caleb", name: "Caleb Ruiz", tags: ["crew"], headline: "Gaffer", bio: "Practicals in frame, always." },
  { id: "nina", name: "Nina Ferreira", tags: ["director"], open: true, headline: "Director", bio: "Documentary habits in fiction films." },
  { id: "otto", name: "Otto Wenzel", tags: ["crew"], headline: "Colorist", bio: "I will talk you out of the green shadows." },
  { id: "lucia", name: "Lucía Moreno", tags: ["actor"], headline: "Actor", bio: "Grew up in a theatre. Still smells like home." },
  { id: "aminata", name: "Aminata Diallo", tags: ["director"], headline: "Director", bio: "Three generations in one kitchen, usually." },
  { id: "esme", name: "Esmé Chaput", tags: ["crew"], headline: "Costume", bio: "Clothes as the first line of dialogue." },
  { id: "vikram", name: "Vikram Shenoy", tags: ["crew"], headline: "VFX · Compositing", bio: "The best effect is the one nobody notices." },
  { id: "paloma", name: "Paloma Reyes", tags: ["actor"], open: true, headline: "Actor", bio: "Looking for something with teeth." },
  { id: "gus", name: "Gus Albright", tags: ["crew"], headline: "Sound mixer", bio: "Twelve years of bad room tone has made me patient." },
  { id: "iris", name: "Iris Kwan", tags: ["director"], headline: "Director", bio: "Short films about long drives." },
  { id: "ned", name: "Ned Harlow", tags: ["actor"], headline: "Actor", bio: "Character parts. Happy to be the neighbour." },
  { id: "sofia", name: "Sofia Bianchi", tags: ["crew"], headline: "Art director", bio: "I build the room, then take half of it out." },
  { id: "tariq", name: "Tariq Mansour", tags: ["crew"], open: true, headline: "Cinematographer", bio: "Available from June. Ask about the night stuff." },
  { id: "wren", name: "Wren Delacroix", tags: ["crew"], headline: "Editor", bio: "The scene is over before you think it is." },
  { id: "bram", name: "Bram de Vries", tags: ["director"], headline: "Director", bio: "Flat country, wide lenses." },
  { id: "adaeze", name: "Adaeze Nwosu", tags: ["actor"], headline: "Actor", bio: "I did a year of radio drama and it ruined me for mumbling." },
  { id: "kostas", name: "Kostas Alexiou", tags: ["crew"], headline: "Boom · Sound", bio: "Cicadas are louder than you remember." },
  { id: "mira", name: "Mira Solberg", tags: ["director"], open: true, headline: "Director", bio: "Looking for a producer who likes boats." },
  { id: "quinn", name: "Quinn Rafferty", tags: [], headline: "", bio: "" },

  { id: "jihoon", name: "김지훈", tags: ["director"], headline: "연출", bio: "오래된 건물이 헐리기 전에 찍어둡니다." },
  { id: "soyeon", name: "박소연", tags: ["actor"], open: true, headline: "배우", bio: "단편이든 장편이든 좋은 대본이면 갑니다." },
  { id: "taeyang", name: "이태양", tags: ["crew"], headline: "촬영", bio: "새벽 네 시의 색을 제일 좋아해요." },
  { id: "boram", name: "정보람", tags: ["crew"], headline: "편집", bio: "붙이는 것보다 덜어내는 쪽을 먼저 봅니다." },
  { id: "gunwoo", name: "최건우", tags: ["crew"], headline: "사운드", bio: "현장음이 반이라고 믿습니다." },
  { id: "sejin", name: "한세진", tags: ["actor"], headline: "배우", bio: "연극 일곱 편, 단편 네 편." },
  { id: "doyun", name: "오도윤", tags: ["director"], headline: "감독", bio: "가족 이야기를 가족 없이 찍는 법을 찾는 중." },
  { id: "chaewon", name: "윤채원", tags: ["actor"], open: true, headline: "배우", bio: "코미디도 할 수 있어요. 진짜로요." },
  { id: "minseok", name: "강민석", tags: ["crew"], headline: "조명", bio: "그림자부터 설계합니다." },
  { id: "areum", name: "신아름", tags: ["crew"], headline: "제작", bio: "예산표와 김밥을 동시에 챙깁니다." },
  { id: "jaemin", name: "서재민", tags: ["director"], headline: "연출 · 각본", bio: "대사 세 줄로 끝나는 장면을 씁니다." },
  { id: "hyerin", name: "권혜린", tags: ["actor"], headline: "배우", bio: "눈으로 하는 연기를 연습 중이에요." },
  { id: "woojin", name: "임우진", tags: ["crew"], open: true, headline: "촬영", bio: "핸드헬드 오래 버틸 수 있습니다." },
  { id: "dain", name: "배다인", tags: ["crew"], headline: "미술", bio: "방 하나로 인물을 설명하고 싶어요." },
  { id: "seungho", name: "남승호", tags: ["actor"], headline: "배우", bio: "사투리 세 가지 가능합니다." },
  { id: "yeeun", name: "조예은", tags: ["director"], headline: "감독", bio: "물가에서 찍는 걸 좋아합니다." },
  { id: "gyuri", name: "문규리", tags: ["crew"], headline: "편집 · 색보정", bio: "컷 길이를 두고 오래 싸웁니다." },
  { id: "hanbyul", name: "유한별", tags: ["actor"], headline: "배우", bio: "무대에서 영화로 넘어오는 중." },
  { id: "seojin", name: "유서진", tags: [], headline: "", bio: "" },

  { id: "ren", name: "高橋 蓮", tags: ["director"], headline: "監督", bio: "終電のあとの町ばかり撮っています。" },
  { id: "sakura", name: "小林 さくら", tags: ["actor"], open: true, headline: "俳優", bio: "舞台と映画、どちらも続けたいです。" },
  { id: "daiki", name: "伊藤 大輝", tags: ["crew"], headline: "撮影", bio: "長回しの呼吸を大事にしています。" },
  { id: "yui", name: "渡辺 結衣", tags: ["crew"], headline: "編集", bio: "音から先に組み立てます。" },
  { id: "haruto", name: "山本 陽翔", tags: ["actor"], headline: "俳優", bio: "台詞の少ない役が好きです。" },
  { id: "nanami", name: "中島 七海", tags: ["director"], headline: "監督・脚本", bio: "家族の食卓を何度も撮り直しています。" },
  { id: "souta", name: "吉田 颯太", tags: ["crew"], headline: "照明", bio: "夜の屋外が一番好きな現場です。" },
  { id: "rin", name: "松本 凛", tags: ["actor"], open: true, headline: "俳優", bio: "オーディションも歓迎、どんな現場でも。" },
  { id: "takumi", name: "井上 拓海", tags: ["crew"], headline: "録音", bio: "部屋の響きを集めています。" },
  { id: "hinata", name: "木村 陽向", tags: ["crew"], headline: "制作", bio: "スケジュール表とおにぎりの担当です。" },
  { id: "kaede", name: "藤田 楓", tags: ["director"], headline: "監督", bio: "海の近くでしか撮れない話があります。" },
  { id: "yuto", name: "岡田 悠斗", tags: ["actor"], headline: "俳優", bio: "殺陣もできます。" },
  { id: "kazuma", name: "村上 一真", tags: [], headline: "", bio: "" },
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
  { id: "low-tide", title: "Low Tide", still: DEMO_STILLS.crewAtSea, school: DEMO_SCHOOLS.riverside, date: "2026-10-12", section: "movies", crew: [["lena", "director"], ["haneul", "cinematography"], ["tomas", "sound"], ["ines", "actor", "Mara"]] },
  { id: "midnight-ferry", title: "Midnight Ferry", still: DEMO_STILLS.underwaterRays, school: DEMO_SCHOOLS.hanbit, date: "2026-10-09", section: "movies", crew: [["yuna", "director"], ["park", "actor", "Minsu"], ["eunseo", "actor", "Sora"], ["seojun", "lighting"], ["minji", "edit"]] },
  { id: "paper-moon", title: "Paper Moon", still: DEMO_STILLS.lighthouse, school: DEMO_SCHOOLS.kitakaze, date: "2026-10-05", section: "movies", crew: [["mio", "writer"], ["kenji", "edit"], ["aiko", "actor", "Yuki"]] },
  { id: "glass-garden", title: "Glass Garden", still: DEMO_STILLS.swell1, school: DEMO_SCHOOLS.northlight, date: "2026-09-28", section: "movies", crew: [["noor", "director"], ["ruth", "sound"], ["amara", "actor", "Iris"], ["leo", "cinematography"]] },
  { id: "northbound", title: "Northbound", still: DEMO_STILLS.portalNight, school: DEMO_SCHOOLS.riverside, date: "2026-09-21", section: "movies", crew: [["sam", "director"], ["theo", "actor", "Jules"], ["marcus", "sound"], ["priya", "production"], ["kai", "lighting"]] },
  { id: "concrete-bloom", title: "Concrete Bloom", still: DEMO_STILLS.livingRoom, school: DEMO_SCHOOLS.hanbit, date: "2026-09-14", section: "entertainment", crew: [["yerin", "director"], ["jiwoo", "actor", "Dahye"], ["hana", "writer"], ["ivy", "other"]] },
  { id: "first-draft", title: "The First Draft", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.northlight, date: "2026-09-02", section: "movies", crew: [["daniel", "director"], ["zoe", "actor", "Ellie"], ["rafael", "writer"], ["lena", "edit"]] },
  { id: "rooftop-sound", title: "Rooftop Sound", still: DEMO_STILLS.stage, school: DEMO_SCHOOLS.riverside, date: "2026-08-25", section: "entertainment", crew: [["grace", "director"], ["omar", "actor", "Sami"], ["yusuf", "cinematography"], ["lena", "edit"]] },
  { id: "flicker", title: "Flicker", still: DEMO_STILLS.wave, school: DEMO_SCHOOLS.hanbit, date: "2026-08-17", section: "movies", crew: [["nari", "director"], ["hugo", "edit"], ["lena", "cinematography"]] },
  { id: "distant-land", title: "Distant Land", still: DEMO_STILLS.cityLights, school: DEMO_SCHOOLS.kitakaze, date: "2026-08-08", section: "movies", crew: [["mei", "director"], ["arjun", "actor", "Dev"], ["clara", "sound"], ["jaehan", "cinematography"]] },
  // …and a few that share someone with those, so the twigs lead on.
  { id: "almost-maine", title: "Almost Maine", still: DEMO_STILLS.swell2, school: DEMO_SCHOOLS.northlight, date: "2026-07-30", section: "movies", crew: [["lena", "writer"], ["park", "actor", "Joon"], ["leo", "cinematography"]] },
  { id: "sink-or-swim", title: "Sink or Swim", still: DEMO_STILLS.underwater, school: DEMO_SCHOOLS.hanbit, date: "2026-07-21", section: "movies", crew: [["yuna", "director"], ["omar", "actor", "Sami"], ["haneul", "cinematography"]] },
  { id: "everything-somewhere", title: "Everything Somewhere", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.kitakaze, date: "2026-07-12", section: "entertainment", crew: [["aiko", "actor", "Rin"], ["theo", "actor", "Max"], ["kenji", "edit"], ["noor", "production"]] },
  { id: "hongdae-concert", title: "Hongdae Concert", still: DEMO_STILLS.arcade, school: DEMO_SCHOOLS.hanbit, date: "2026-07-03", section: "entertainment", crew: [["daniel", "director"], ["jiwoo", "actor", "Minji"], ["seojun", "lighting"]] },
  { id: "late-show", title: "Late Show", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.riverside, date: "2026-06-20", section: "entertainment", crew: [["amara", "actor"], ["sam", "director"]] },

  // Series, shorts and the rest of the shows, so every section has something.
  { id: "nine-pm", title: "9 PM Conversation", still: DEMO_STILLS.studio, school: DEMO_SCHOOLS.harbourline, date: "2026-06-11", section: "entertainment", crew: [["elena", "director"], ["naomi", "actor", "Ada"], ["ned", "actor", "Walter"], ["gus", "sound"], ["tess", "production"]] },
  { id: "share-house", title: "Share House", still: DEMO_STILLS.livingRoom, school: DEMO_SCHOOLS.dalbit, date: "2026-06-02", section: "series", crew: [["jihoon", "director"], ["soyeon", "actor", "은비"], ["seungho", "actor", "준서"], ["taeyang", "cinematography"], ["areum", "production"], ["dain", "other"]] },
  { id: "kitchen-light", title: "Kitchen Light", still: DEMO_STILLS.kitchen, school: DEMO_SCHOOLS.seonjae, date: "2026-05-24", section: "entertainment", crew: [["doyun", "director"], ["chaewon", "actor", "미래"], ["gunwoo", "sound"], ["boram", "edit"]] },
  { id: "the-run", title: "The Run", still: DEMO_STILLS.arcade, school: DEMO_SCHOOLS.cedar, date: "2026-05-15", section: "entertainment", crew: [["rowan", "director"], ["paloma", "actor", "Vera"], ["dev", "other"], ["caleb", "lighting"], ["wren", "edit"]] },
  { id: "field-trip", title: "Field Trip", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.minatogawa, date: "2026-05-06", section: "entertainment", crew: [["nanami", "director"], ["haruto", "actor", "大地"], ["sakura", "actor", "ひかり"], ["souta", "lighting"], ["hinata", "production"]] },
  { id: "campus-hours", title: "Campus Hours", still: DEMO_STILLS.outdoors, school: DEMO_SCHOOLS.bayard, date: "2026-04-27", section: "series", crew: [["nina", "director"], ["maya", "actor", "Juno"], ["bea", "actor", "Pia"], ["silas", "cinematography"], ["esme", "other"], ["jonah", "sound"]] },
  { id: "salt-and-tide", title: "Salt and Tide", still: DEMO_STILLS.shoreline, school: DEMO_SCHOOLS.fenmark, date: "2026-04-18", section: "movies", crew: [["mira", "director"], ["lucia", "actor", "Carmen"], ["tariq", "cinematography"], ["kostas", "sound"], ["sofia", "other"]] },
  { id: "the-long-walk-home", title: "The Long Walk Home", still: DEMO_STILLS.swell3, school: DEMO_SCHOOLS.harbourline, date: "2026-04-09", section: "movies", crew: [["elena", "director"], ["adaeze", "actor", "Nkechi"], ["felix", "edit"], ["otto", "other"], ["jonah", "sound"]] },
  { id: "after-rain", title: "After Rain", still: DEMO_STILLS.swell3, school: DEMO_SCHOOLS.asagiri, date: "2026-03-31", section: "shorts", crew: [["kaede", "director"], ["rin", "actor", "さやか"], ["daiki", "cinematography"]] },
  { id: "breath-hold", title: "Breath Hold", still: DEMO_STILLS.underwater, school: DEMO_SCHOOLS.kitakaze, date: "2026-03-22", section: "shorts", crew: [["ren", "director"], ["yuto", "actor", "湊"], ["takumi", "sound"], ["yui", "edit"]] },
  { id: "the-swell", title: "The Swell", still: DEMO_STILLS.waveNight, school: DEMO_SCHOOLS.fenmark, date: "2026-03-13", section: "movies", crew: [["bram", "director"], ["ned", "actor", "Pieter"], ["tariq", "cinematography"], ["vikram", "other"], ["tess", "production"]] },
  { id: "undertow", title: "Undertow", still: DEMO_STILLS.portalWide, school: DEMO_SCHOOLS.riverside, date: "2026-03-04", section: "movies", crew: [["cora", "director"], ["bea", "actor", "Ingrid"], ["silas", "cinematography"], ["gus", "sound"], ["wren", "edit"], ["dev", "other"]] },
  { id: "night-shift", title: "Night Shift", still: DEMO_STILLS.cityLights, school: DEMO_SCHOOLS.dalbit, date: "2026-02-23", section: "series", crew: [["jaemin", "director"], ["hyerin", "actor", "수아"], ["sejin", "actor", "태호"], ["woojin", "cinematography"], ["minseok", "lighting"], ["gyuri", "edit"]] },
  { id: "terrain", title: "Terrain", still: DEMO_STILLS.starfield, school: DEMO_SCHOOLS.cedar, date: "2026-02-14", section: "shorts", crew: [["iris", "director"], ["naomi", "actor", "Bess"], ["caleb", "lighting"]] },
  { id: "island-season", title: "Island Season", still: DEMO_STILLS.shoreline, school: DEMO_SCHOOLS.seonjae, date: "2026-02-05", section: "series", crew: [["yeeun", "director"], ["hanbyul", "actor", "지연"], ["chaewon", "actor", "보미"], ["taeyang", "cinematography"], ["areum", "production"]] },
  { id: "beyond-the-surface", title: "Beyond the Surface", still: DEMO_STILLS.underwaterRays, school: DEMO_SCHOOLS.minatogawa, date: "2026-01-27", section: "shorts", crew: [["nanami", "director"], ["sakura", "actor", "あおい"], ["yui", "edit"]] },
  { id: "the-reading", title: "The Reading", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.bayard, date: "2026-01-18", section: "shorts", crew: [["aminata", "director"], ["adaeze", "actor", "Zainab"], ["lucia", "actor", "Pilar"], ["kostas", "sound"]] },
  { id: "two-rooms", title: "Two Rooms", still: DEMO_STILLS.portalRocks, school: DEMO_SCHOOLS.northlight, date: "2026-01-09", section: "movies", crew: [["rowan", "director"], ["maya", "actor", "Edie"], ["felix", "edit"], ["sofia", "other"], ["priya", "production"]] },
  { id: "last-bus", title: "Last Bus", still: DEMO_STILLS.waveNight, school: DEMO_SCHOOLS.hanbit, date: "2025-12-29", section: "shorts", crew: [["nari", "director"], ["soyeon", "actor", "하람"], ["gunwoo", "sound"]] },
  { id: "groundwork", title: "Groundwork", still: DEMO_STILLS.starfield, school: DEMO_SCHOOLS.harbourline, date: "2025-12-18", section: "movies", crew: [["cora", "director"], ["ned", "actor", "Sol"], ["dev", "other"], ["otto", "other"], ["jonah", "sound"], ["esme", "other"]] },
  { id: "open-call", title: "Open Call", still: DEMO_STILLS.studio, school: DEMO_SCHOOLS.riverside, date: "2025-12-07", section: "entertainment", crew: [["grace", "director"], ["paloma", "actor"], ["haeun", "actor"], ["naomi", "actor"], ["tess", "production"]] },
  { id: "the-quiet-part", title: "The Quiet Part", still: DEMO_STILLS.rooftopCity, school: DEMO_SCHOOLS.asagiri, date: "2025-11-26", section: "movies", crew: [["ren", "director"], ["haruto", "actor", "悠"], ["daiki", "cinematography"], ["takumi", "sound"], ["souta", "lighting"]] },
  { id: "seventh-floor", title: "Seventh Floor", still: DEMO_STILLS.portalRocks, school: DEMO_SCHOOLS.dalbit, date: "2025-11-15", section: "series", crew: [["jihoon", "director"], ["seungho", "actor", "강우"], ["hyerin", "actor", "서윤"], ["woojin", "cinematography"], ["dain", "other"], ["boram", "edit"]] },
  { id: "summer-intern", title: "Summer Intern", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.cedar, date: "2025-11-04", section: "series", crew: [["iris", "director"], ["bea", "actor", "Hollie"], ["arjun", "actor", "Ravi"], ["wren", "edit"], ["caleb", "lighting"]] },
  { id: "one-more-take", title: "One More Take", still: DEMO_STILLS.talkSet, school: DEMO_SCHOOLS.fenmark, date: "2025-10-24", section: "entertainment", crew: [["mira", "director"], ["zoe", "actor"], ["yuto", "actor"], ["vikram", "other"], ["gus", "sound"]] },
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
  "park:midnight-ferry": "Minsu barely speaks. I spent the shoot learning to act with my hands.",
  "yuna:midnight-ferry": "Shot on a real ferry, three crossings a night for a week.",
};
