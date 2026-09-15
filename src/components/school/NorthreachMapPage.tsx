"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import GeoWorldMap, {
  GEO_MAP,
  projectGeoCoordinate,
  unprojectGeoCoordinate,
  type GeoViewport,
} from "@/components/school/GeoWorldMap";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import type { SchoolListItem } from "@/types/school";
import "@/components/school/northreach-map.css";

type SchoolRegion = "North America" | "Europe" | "Asia-Pacific";
type Region = "All Regions" | "United States" | SchoolRegion;
type LabelSide = "left" | "right" | "above" | "below";
type FictionalZoneSize = "large" | "medium" | "small";

type MapSchool = {
  id: string;
  name: string;
  short: string;
  count: string;
  countDetail?: string;
  students: number;
  region: SchoolRegion;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  labelOffset?: { x?: number; y?: number };
  labelSide?: LabelSide;
  zoneSize?: "large" | "medium" | "small";
  color: string;
  colorAlt: string;
  logo?: string;
};

const REGIONS: Region[] = ["All Regions", "United States", "North America", "Europe", "Asia-Pacific"];
const ACTIVE_MAP_MODE: "fictional" | "geographic" =
  process.env.NEXT_PUBLIC_SCHOOL_MAP_MODE === "geographic" ? "geographic" : "fictional";

type FictionalMapPosition = {
  x: number;
  y: number;
  zoneSize: FictionalZoneSize;
};

const FICTIONAL_SCHOOL_POSITIONS: Record<string, FictionalMapPosition> = {
  ucla: { x: 30, y: 20, zoneSize: "medium" },
  "penn-state": { x: 66, y: 25, zoneSize: "large" },
  nyu: { x: 51, y: 18, zoneSize: "small" },
  berkeley: { x: 40, y: 28, zoneSize: "small" },
  mit: { x: 56, y: 29, zoneSize: "small" },
  snu: { x: 15, y: 49, zoneSize: "medium" },
  pku: { x: 23, y: 60, zoneSize: "small" },
  tsinghua: { x: 28, y: 45, zoneSize: "small" },
  nus: { x: 15, y: 64, zoneSize: "small" },
  toronto: { x: 78, y: 47, zoneSize: "small" },
  mcgill: { x: 87, y: 54, zoneSize: "small" },
  melbourne: { x: 83, y: 65, zoneSize: "medium" },
  oxford: { x: 44, y: 71, zoneSize: "small" },
  tokyo: { x: 58, y: 78, zoneSize: "medium" },
  sydney: { x: 52, y: 88, zoneSize: "small" },
};

const FICTIONAL_OVERFLOW_POSITIONS: FictionalMapPosition[] = [
  { x: 22, y: 17, zoneSize: "small" },
  { x: 61, y: 16, zoneSize: "small" },
  { x: 72, y: 20, zoneSize: "small" },
  { x: 10, y: 56, zoneSize: "small" },
  { x: 29, y: 55, zoneSize: "small" },
  { x: 76, y: 57, zoneSize: "small" },
  { x: 89, y: 45, zoneSize: "small" },
  { x: 38, y: 79, zoneSize: "small" },
  { x: 64, y: 70, zoneSize: "small" },
  { x: 59, y: 88, zoneSize: "small" },
];

const FICTIONAL_MAP_LABELS: Record<string, string> = {
  toronto: "Univ. of Toronto",
  mcgill: "McGill",
  melbourne: "U of Melbourne",
  nus: "NUS",
};

const MAP_VIEWPORTS: Record<Region, GeoViewport> = {
  "All Regions": GEO_MAP,
  "United States": {
    latitudeTop: 50.8,
    latitudeBottom: 24.2,
    longitudeLeft: -125.5,
    longitudeRight: -66.2,
  },
  "North America": {
    latitudeTop: 79,
    latitudeBottom: 5,
    longitudeLeft: -180,
    longitudeRight: -26,
  },
  Europe: {
    latitudeTop: 73,
    latitudeBottom: 28,
    longitudeLeft: -24,
    longitudeRight: 70,
  },
  "Asia-Pacific": {
    latitudeTop: 66,
    latitudeBottom: -52,
    longitudeLeft: -50,
    longitudeRight: 180,
  },
};

const MAP_GUIDES: Record<Region, { longitudes: number[]; latitudes: number[] }> = {
  "All Regions": { longitudes: [-120, -60, 0, 60, 120], latitudes: [60, 30, 0, -30, -60] },
  "United States": { longitudes: [-120, -100, -80], latitudes: [50, 40, 30] },
  "North America": { longitudes: [-150, -120, -90, -60], latitudes: [60, 30] },
  Europe: { longitudes: [0, 30, 60], latitudes: [60, 45, 30] },
  "Asia-Pacific": { longitudes: [0, 60, 120, 180], latitudes: [60, 30, 0, -30] },
};

const AdminMapDiagnosticsControl = dynamic(
  () => import("@/components/school/AdminMapDiagnosticsControl"),
  { ssr: false }
);

function projectSchoolLocation(school: MapSchool, viewport: GeoViewport): { x: number; y: number } {
  return projectGeoCoordinate(school.latitude ?? 0, school.longitude ?? 0, viewport);
}

function formatLatitude(latitude: number): string {
  return `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}`;
}

function formatLongitude(longitude: number): string {
  return `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;
}

function formatGuideDegree(value: number, positive: string, negative: string): string {
  if (value === 0) return "0°";
  return `${Math.abs(value)}°${value > 0 ? positive : negative}`;
}

const EUROPE_COUNTRY_CODES = new Set([
  "AT", "BE", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB", "GR", "IE", "IS",
  "IT", "NL", "NO", "PL", "PT", "RO", "SE", "UA",
]);

function regionForSchool(school: SchoolListItem): SchoolRegion {
  const countryCode = (school.location?.countryCode ?? "").toUpperCase();
  if (EUROPE_COUNTRY_CODES.has(countryCode)) return "Europe";
  if (["US", "CA", "MX"].includes(countryCode)) return "North America";
  if ((school.location?.longitude ?? 0) < -30) return "North America";
  return "Asia-Pacific";
}

function schoolNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(the|university|of)\b/g, "")
    .replace("pennsylvania", "penn")
    .replace(/[^a-z0-9]/g, "");
}

function registeredMapSchool(school: SchoolListItem): MapSchool {
  const works = school.workCount ?? 0;
  return {
    id: school.id,
    name: school.shortName || school.name,
    short: school.initials,
    count: works > 0 ? `${works} works` : "New",
    countDetail: works > 0 ? `${works} published works` : "Newly registered school",
    students: 0,
    region: regionForSchool(school),
    countryCode: school.location?.countryCode?.toUpperCase(),
    latitude: school.location?.latitude,
    longitude: school.location?.longitude,
    labelSide: (school.location?.longitude ?? 0) > 115 ? "left" : "right",
    color: school.colorPrimary,
    colorAlt: school.colorSecondary,
    logo: school.logoUrl ?? undefined,
  };
}

const SCHOOLS: MapSchool[] = [
  { id: "penn-state", name: "Penn State", short: "PS", count: "2.3K", students: 2300, region: "North America", countryCode: "US", latitude: 40.7982, longitude: -77.8599, labelSide: "left", labelOffset: { x: -3, y: 24 }, zoneSize: "large", color: "#123c88", colorAlt: "#eef4ff", logo: "/images/campus/schools/psu.png" },
  { id: "snu", name: "SNU", short: "SNU", count: "1.9K", students: 1900, region: "Asia-Pacific", countryCode: "KR", latitude: 37.4599, longitude: 126.9519, labelSide: "right", labelOffset: { x: 2, y: 19 }, color: "#4564a8", colorAlt: "#f4f6ff" },
  { id: "ucla", name: "UCLA", short: "UCLA", count: "1.8K", students: 1800, region: "North America", countryCode: "US", latitude: 34.0689, longitude: -118.4452, labelSide: "left", zoneSize: "medium", color: "#1f78bc", colorAlt: "#f5c449", logo: "/images/campus/schools/ucla.svg" },
  { id: "pku", name: "PKU", short: "PKU", count: "1.5K", students: 1500, region: "Asia-Pacific", countryCode: "CN", latitude: 39.9927, longitude: 116.3054, labelSide: "left", labelOffset: { y: -9 }, color: "#8d1838", colorAlt: "#fff4f6" },
  { id: "nyu", name: "NYU", short: "NYU", count: "1.4K", students: 1400, region: "North America", countryCode: "US", latitude: 40.7295, longitude: -73.9965, labelSide: "right", labelOffset: { x: 3, y: 21 }, zoneSize: "small", color: "#5d2ca8", colorAlt: "#f6f0ff", logo: "/images/campus/schools/nyu.svg" },
  { id: "tokyo", name: "University of Tokyo", short: "UT", count: "1.3K", students: 1300, region: "Asia-Pacific", countryCode: "JP", latitude: 35.7126, longitude: 139.761, labelSide: "left", labelOffset: { x: -2, y: 28 }, color: "#dfa800", colorAlt: "#1d62a5" },
  { id: "tsinghua", name: "Tsinghua", short: "TH", count: "1.2K", students: 1200, region: "Asia-Pacific", countryCode: "CN", latitude: 40.0004, longitude: 116.326, labelSide: "right", labelOffset: { y: -13 }, color: "#c86ebc", colorAlt: "#fff4ff" },
  { id: "berkeley", name: "UC Berkeley", short: "CAL", count: "1.1K", students: 1100, region: "North America", countryCode: "US", latitude: 37.8719, longitude: -122.2585, labelSide: "left", zoneSize: "small", color: "#9b6c10", colorAlt: "#f2c84b", logo: "/images/campus/schools/berkeley.svg" },
  { id: "toronto", name: "University of Toronto", short: "U of T", count: "1.1K", students: 1080, region: "North America", countryCode: "CA", latitude: 43.6629, longitude: -79.3957, labelSide: "above", labelOffset: { x: -42, y: -22 }, color: "#1555a4", colorAlt: "#dcecff" },
  { id: "melbourne", name: "University of Melbourne", short: "UM", count: "1.0K", students: 1000, region: "Asia-Pacific", countryCode: "AU", latitude: -37.7983, longitude: 144.961, labelSide: "left", color: "#174784", colorAlt: "#eaf2ff" },
  { id: "oxford", name: "University of Oxford", short: "OX", count: "930", students: 930, region: "Europe", countryCode: "GB", latitude: 51.7548, longitude: -1.2544, labelSide: "left", color: "#1c477a", colorAlt: "#e2edf8" },
  { id: "nus", name: "National University of Singapore", short: "NUS", count: "920", students: 920, region: "Asia-Pacific", countryCode: "SG", latitude: 1.2966, longitude: 103.7764, labelSide: "left", color: "#ef7c18", colorAlt: "#163b80" },
  { id: "sydney", name: "University of Sydney", short: "USYD", count: "870", students: 870, region: "Asia-Pacific", countryCode: "AU", latitude: -33.8886, longitude: 151.1873, labelSide: "right", labelOffset: { x: 2, y: 17 }, color: "#a4142e", colorAlt: "#fff0f2" },
  { id: "mit", name: "MIT", short: "MIT", count: "820", students: 820, region: "North America", countryCode: "US", latitude: 42.3601, longitude: -71.0942, labelSide: "right", labelOffset: { x: 8, y: -27 }, zoneSize: "small", color: "#8d2837", colorAlt: "#f4e7e9" },
  { id: "mcgill", name: "McGill University", short: "MCG", count: "620", students: 620, region: "North America", countryCode: "CA", latitude: 45.5048, longitude: -73.5772, labelSide: "left", labelOffset: { x: -4, y: -4 }, color: "#ba2636", colorAlt: "#ffffff" },
];

function Chevron({ direction = "right" }: { direction?: "right" | "down" }) {
  return <span className={`nr-chevron ${direction === "down" ? "down" : ""}`} aria-hidden="true" />;
}

function SchoolCrest({ school }: { school: MapSchool }) {
  const style = {
    "--crest-primary": school.color,
    "--crest-secondary": school.colorAlt,
  } as CSSProperties;

  return (
    <span className="school-crest" style={style} aria-hidden="true">
      {school.logo ? (
        <Image src={school.logo} alt="" fill sizes="36px" className="crest-image" unoptimized />
      ) : (
        <>
          <span className="crest-ring" />
          <span className="crest-mark">{school.short}</span>
        </>
      )}
    </span>
  );
}

export default function NorthreachMapPage() {
  const [region, setRegion] = useState<Region>("All Regions");
  const [regionOpen, setRegionOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [coordinateGuide, setCoordinateGuide] = useState(false);
  const [cursorCoordinate, setCursorCoordinate] = useState<{
    x: number;
    y: number;
    latitude: number;
    longitude: number;
  } | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const { items: registeredSchools } = useSchoolsFeed(50);
  const mapDiagnosticsEnabled = coordinateGuide;
  const mapViewport = MAP_VIEWPORTS[region];
  const mapGuides = MAP_GUIDES[region];

  const allSchools = useMemo(() => {
    const featuredIds = new Set(SCHOOLS.map((school) => school.id));
    const featuredNames = new Set(SCHOOLS.map((school) => schoolNameKey(school.name)));
    const additions = registeredSchools.flatMap((school) => {
      if (featuredIds.has(school.id) || featuredNames.has(schoolNameKey(school.name))) return [];
      const duplicatesFeaturedLocation = school.location && SCHOOLS.some((featured) =>
        featured.latitude !== undefined
        && featured.longitude !== undefined
        && Math.abs(featured.latitude - school.location!.latitude) < 0.2
        && Math.abs(featured.longitude - school.location!.longitude) < 0.2
      );
      if (duplicatesFeaturedLocation) return [];
      return [registeredMapSchool(school)];
    });
    return [...SCHOOLS, ...additions];
  }, [registeredSchools]);

  const filteredSchools = useMemo(
    () => allSchools.filter((school) => {
      if (ACTIVE_MAP_MODE === "fictional") return true;
      if (region === "All Regions") return true;
      if (region === "United States") return school.countryCode === "US";
      return school.region === region;
    }),
    [allSchools, region]
  );
  const visibleSchools = showAll ? filteredSchools : filteredSchools.slice(0, 10);
  let overflowPositionIndex = 0;
  const mapMarkers = (ACTIVE_MAP_MODE === "fictional" ? allSchools : visibleSchools)
    .flatMap((school) => {
      if (ACTIVE_MAP_MODE === "geographic") {
        if (school.latitude === undefined || school.longitude === undefined) return [];
        return [{
          school,
          point: projectSchoolLocation(school, mapViewport),
          zoneSize: "small" as FictionalZoneSize,
        }];
      }

      const point = FICTIONAL_SCHOOL_POSITIONS[school.id]
        ?? FICTIONAL_OVERFLOW_POSITIONS[overflowPositionIndex++ % FICTIONAL_OVERFLOW_POSITIONS.length];
      return [{ school, point, zoneSize: point.zoneSize }];
    });
  const rankedSchools = visibleSchools;
  const selectedSchool = allSchools.find((school) => school.id === selectedId) ?? null;

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) setRegionOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!selectedSchool) return;
    setToastVisible(true);
    const timeout = window.setTimeout(() => setToastVisible(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [selectedSchool]);

  function chooseSchool(id: string) {
    setSelectedId(id);
  }

  function chooseRegion(nextRegion: Region) {
    setRegion(nextRegion);
    setRegionOpen(false);
    setShowAll(false);
    setSelectedId(null);
  }

  function inspectCoordinate(event: ReactPointerEvent<HTMLElement>) {
    if (ACTIVE_MAP_MODE !== "geographic" || !mapDiagnosticsEnabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      setCursorCoordinate(null);
      return;
    }
    const coordinate = unprojectGeoCoordinate(x, y, mapViewport);
    setCursorCoordinate({
      x,
      y,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  }

  return (
    <div className="nr">
      <main className={`atlas-shell${ACTIVE_MAP_MODE === "fictional" ? " fictional-atlas" : ""}`}>
        <section className="map-panel" aria-label="Interactive school map">
          <div className="schools-intro">
            <h1 className="map-heading-visually-hidden">Schools on OONA</h1>

            {ACTIVE_MAP_MODE === "geographic" ? (
              <div className="map-controls">
                <div className="region-filter" ref={regionRef}>
                  <button
                    type="button"
                    className="region-button"
                    aria-haspopup="listbox"
                    aria-expanded={regionOpen}
                    onClick={() => setRegionOpen((open) => !open)}
                  >
                    <span>{region}</span>
                    <Chevron direction="down" />
                  </button>
                  {regionOpen ? (
                    <div className="region-menu" role="listbox" aria-label="Filter schools by region">
                      {REGIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="option"
                          aria-selected={item === region}
                          className={item === region ? "selected" : undefined}
                          onClick={() => chooseRegion(item)}
                        >
                          {item}
                          {item === region ? <span aria-hidden="true">✓</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <AdminMapDiagnosticsControl
                  enabled={coordinateGuide}
                  onChange={(enabled) => {
                    setCoordinateGuide(enabled);
                    setCursorCoordinate(null);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div
            className={`geo-map-stage ${ACTIVE_MAP_MODE === "fictional" ? "fictional-focus" : region === "United States" ? "regional-focus" : ""}`}
            onPointerMove={inspectCoordinate}
            onPointerDown={inspectCoordinate}
            onPointerLeave={() => setCursorCoordinate(null)}
          >
            {ACTIVE_MAP_MODE === "geographic" ? (
              <GeoWorldMap showAdminOutlines={mapDiagnosticsEnabled} viewport={mapViewport} />
            ) : (
              <div className="fictional-map-art" aria-hidden="true" />
            )}

            {ACTIVE_MAP_MODE === "geographic" && mapDiagnosticsEnabled ? (
              <div className="coordinate-guide" aria-hidden="true">
              <div
                className="coordinate-frame"
              >
                <span>Geographic map · exact coordinates</span>
              </div>

              {mapGuides.longitudes.map((longitude) => (
                <div
                  key={`longitude-${longitude}`}
                  className="coordinate-line longitude-line"
                  style={
                    {
                      "--guide-position": `${projectGeoCoordinate(0, longitude, mapViewport).x}%`,
                      "--guide-start": "0%",
                      "--guide-size": "100%",
                    } as CSSProperties
                  }
                >
                  <span>{formatGuideDegree(longitude, "E", "W")}</span>
                </div>
              ))}

              {mapGuides.latitudes.map((latitude) => (
                <div
                  key={`latitude-${latitude}`}
                  className="coordinate-line latitude-line"
                  style={
                    {
                      "--guide-position": `${projectGeoCoordinate(latitude, 0, mapViewport).y}%`,
                      "--guide-start": "0%",
                      "--guide-size": "100%",
                    } as CSSProperties
                  }
                >
                  <span>{formatGuideDegree(latitude, "N", "S")}</span>
                </div>
              ))}

              {cursorCoordinate ? (
                <>
                  <i className="coordinate-crosshair vertical" style={{ left: `${cursorCoordinate.x}%` }} />
                  <i className="coordinate-crosshair horizontal" style={{ top: `${cursorCoordinate.y}%` }} />
                  <output className="coordinate-readout">
                    <span>{formatLatitude(cursorCoordinate.latitude)}</span>
                    <span>{formatLongitude(cursorCoordinate.longitude)}</span>
                    <small>map {cursorCoordinate.x.toFixed(2)}%, {cursorCoordinate.y.toFixed(2)}%</small>
                  </output>
                </>
              ) : (
                <div className="coordinate-hint">Pins and land use the same geographic projection</div>
              )}
              </div>
            ) : null}

            <div className="hotspot-layer">
              {mapMarkers.map(({ school, point, zoneSize }) => {
                const style = {
                  "--x": `${point.x}%`,
                  "--y": `${point.y}%`,
                  "--label-x": `${school.labelOffset?.x ?? 0}px`,
                  "--label-y": `${school.labelOffset?.y ?? 0}px`,
                } as CSSProperties;
                return (
                  <button
                    key={school.id}
                    type="button"
                    className={`hotspot zone-${zoneSize} label-${school.labelSide ?? "right"}${selectedId === school.id ? " active" : ""}`}
                    style={style}
                    data-latitude={ACTIVE_MAP_MODE === "geographic" ? school.latitude : undefined}
                    data-longitude={ACTIVE_MAP_MODE === "geographic" ? school.longitude : undefined}
                    aria-label={`${school.name}, ${school.countDetail ?? `${school.count} student creators`}`}
                    aria-pressed={selectedId === school.id}
                    onClick={() => chooseSchool(school.id)}
                  >
                    <span className="pin-halo" aria-hidden="true" />
                    <span className="pin-core" aria-hidden="true" />
                    <span className="hotspot-label">
                      <strong>{ACTIVE_MAP_MODE === "fictional" ? FICTIONAL_MAP_LABELS[school.id] ?? school.name : school.name}</strong>
                      <small>{school.count}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="legend" aria-label="Student creator legend">
            <p>Student creators</p>
            <div className="legend-line"><i className="legend-orb orb-xl" /><span>2.0K+</span></div>
            <div className="legend-line"><i className="legend-orb orb-lg" /><span>1.0K – 2.0K</span></div>
            <div className="legend-line"><i className="legend-orb orb-md" /><span>500 – 1.0K</span></div>
            <div className="legend-line"><i className="legend-orb orb-sm" /><span>&lt; 500</span></div>
          </aside>
        </section>

        <aside className="ranking-rail" aria-label="Schools on OONA">
          <div className="ranking-head"><h2>Schools on OONA</h2></div>

          <ol className="ranking-list">
            {rankedSchools.map((school, index) => {
              return (
                <li key={school.id}>
                  <button
                    type="button"
                    className={`rank-row${selectedId === school.id ? " active" : ""}`}
                    onClick={() => chooseSchool(school.id)}
                    aria-pressed={selectedId === school.id}
                  >
                    <span className="rank-number">{index + 1}</span>
                    <SchoolCrest school={school} />
                    <span className="rank-school-info">
                      <span className="rank-name">{school.name}</span>
                      {mapDiagnosticsEnabled && school.latitude !== undefined && school.longitude !== undefined ? (
                        <small className="rank-coordinate">
                          {formatLatitude(school.latitude)} · {formatLongitude(school.longitude)}
                        </small>
                      ) : null}
                    </span>
                    <span className="rank-count">{school.count}</span>
                    <Chevron />
                  </button>
                </li>
              );
            })}
          </ol>

          {filteredSchools.length > 10 ? (
            <button
              type="button"
              className="view-all"
              aria-expanded={showAll}
              onClick={() => setShowAll((expanded) => !expanded)}
            >
              <span>{showAll ? "Show top 10" : "View all schools"}</span>
              <span className={showAll ? "view-arrow up" : "view-arrow"} aria-hidden="true">→</span>
            </button>
          ) : null}
        </aside>

        <div className={`selection-toast${toastVisible && selectedSchool ? " show" : ""}`} role="status" aria-live="polite">
          {selectedSchool ? (
            <>
              <SchoolCrest school={selectedSchool} />
              <span>
                <strong>{selectedSchool.name}</strong>
                <small>
                  {selectedSchool.latitude !== undefined && selectedSchool.longitude !== undefined
                    ? `${formatLatitude(selectedSchool.latitude)} · ${formatLongitude(selectedSchool.longitude)}`
                    : selectedSchool.countDetail ?? `${selectedSchool.count} student creators`}
                </small>
              </span>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
