/**
 * northreach-map/script.js, used as written.
 *
 * The only change is scoping: the handful of `document.querySelector` calls now
 * look inside the mounted root, and the high-contrast class toggles on that root
 * instead of `document.body`, so the page can live inside the XIIO shell. The
 * school data, the sizes, the interactions and the copy are untouched.
 */
export function initNorthreachMap(root: HTMLElement): () => void {
  const schools = [
    { name: "Penn State", short: "PS", count: "2.3K", size: "s-xl", x: 60, y: 24, color: "#174c9b" },
    { name: "SNU", short: "SNU", count: "1.9K", size: "s-lg", x: 8.5, y: 47, color: "#46629e" },
    { name: "UCLA", short: "UCLA", count: "1.8K", size: "s-xl", x: 27, y: 18, color: "#287dc5" },
    { name: "PKU", short: "PKU", count: "1.5K", size: "s-md", x: 19, y: 59, color: "#9b1f4e" },
    { name: "NYU", short: "NYU", count: "1.4K", size: "s-lg", x: 45, y: 15, color: "#6b3ac7" },
    { name: "University of Tokyo", short: "UT", count: "1.3K", size: "s-lg", x: 44, y: 75, color: "#e7ad14" },
    { name: "Tsinghua", short: "TH", count: "1.2K", size: "s-md", x: 18, y: 41, color: "#d169bd" },
    { name: "UC Berkeley", short: "UCB", count: "1.1K", size: "s-lg", x: 39, y: 31, color: "#b18425" },
    { name: "Univ. of Toronto", short: "UT", count: "1.1K", size: "s-lg aqua", x: 57, y: 47, color: "#1b4e98" },
    { name: "U of Melbourne", short: "UM", count: "1.0K", size: "s-md", x: 62, y: 67, color: "#2255a4" },
    { name: "NUS", short: "NUS", count: "980", size: "s-sm", x: 10.5, y: 65, color: "#4266a1" },
    { name: "University of Oxford", short: "OX", count: "930", size: "s-md", x: 33, y: 68, color: "#1f477f" },
    { name: "University of Sydney", short: "US", count: "870", size: "s-sm", x: 39, y: 88, color: "#4b4e9d" },
    { name: "MIT", short: "MIT", count: "920", size: "s-sm", x: 49, y: 35, color: "#8f3341" },
    { name: "McGill", short: "MG", count: "620", size: "s-sm", x: 67.5, y: 55, color: "#9b3849" }
  ];

  const hotspotLayer = root.querySelector<HTMLElement>("#hotspot-layer")!;
  const rankingList = root.querySelector<HTMLElement>("#ranking-list")!;
  const rankingCard = root.querySelector<HTMLElement>(".ranking-card")!;
  const viewAllButton = root.querySelector<HTMLButtonElement>("#view-all")!;
  const shell = root.querySelector<HTMLElement>(".atlas-shell")!;
  const railToggle = root.querySelector<HTMLButtonElement>("#rail-toggle")!;
  const toast = root.querySelector<HTMLElement>("#selection-toast")!;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  schools.forEach((school, index: number) => {
    const hotspot = document.createElement("button");
    hotspot.type = "button";
    hotspot.className = `hotspot ${school.size}`;
    hotspot.style.setProperty("--x", `${school.x}%`);
    hotspot.style.setProperty("--y", `${school.y}%`);
    hotspot.dataset.school = school.name;
    hotspot.setAttribute("aria-label", `${school.name}, ${school.count} student users`);
    hotspot.innerHTML = `<strong>${school.name}</strong><span>${school.count}</span>`;
    hotspot.addEventListener("click", () => selectSchool(school.name));
    hotspotLayer.append(hotspot);

    const row = document.createElement("li");
    row.className = `rank-row${index >= 10 ? " extra" : ""}`;
    row.dataset.school = school.name;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Select ${school.name}`);
    row.innerHTML = `
      <span class="rank-number">${index + 1}</span>
      <span class="crest" style="--crest:${school.color}">${school.short}</span>
      <span class="rank-name">${school.name}</span>
      <span class="rank-count">${school.count}</span>
      <span class="chevron" aria-hidden="true"></span>`;
    row.addEventListener("click", () => selectSchool(school.name));
    row.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSchool(school.name);
      }
    });
    rankingList.append(row);
  });

  function selectSchool(name: string) {
    root.querySelectorAll<HTMLElement>("[data-school]").forEach(element => {
      element.classList.toggle("active", element.dataset.school === name);
    });
    const school = schools.find(item => item.name === name)!;
    toast.textContent = `${school.name} · ${school.count} student users`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  viewAllButton.addEventListener("click", () => {
    const expanded = rankingCard.classList.toggle("expanded");
    viewAllButton.textContent = expanded ? "Show Top 10" : "View All Schools";
    viewAllButton.setAttribute("aria-expanded", String(expanded));
  });

  railToggle.addEventListener("click", () => {
    const collapsed = shell.classList.toggle("rail-collapsed");
    railToggle.setAttribute("aria-expanded", String(!collapsed));
  });

  root.querySelector<HTMLButtonElement>(".utility")!.addEventListener("click", () => {
    root.classList.toggle("high-contrast");
    toast.textContent = root.classList.contains("high-contrast")
      ? "Map glow increased"
      : "Map glow restored";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
  });

  return function teardown() {
    hotspotLayer.replaceChildren();
    rankingList.replaceChildren();
    clearTimeout(toastTimer);
  };
}
