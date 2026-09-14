"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSchoolsFeed } from "@/hooks/useSchoolsFeed";
import type { SchoolListItem } from "@/types/school";
import "@/components/school/northreach-map.css";

type Region = "All Regions" | "North America" | "Europe" | "Asia-Pacific";
type LabelSide = "left" | "right" | "above" | "below";

type MapSchool = {
  id: string;
  name: string;
  short: string;
  count: string;
  countDetail?: string;
  students: number;
  region: Exclude<Region, "All Regions">;
  latitude?: number;
  longitude?: number;
  /** Screen-space decluttering only; the hotspot anchor stays on the projected coordinate. */
  markerOffset?: { x?: number; y?: number };
  labelOffset?: { x?: number; y?: number };
  labelSide?: LabelSide;
  color: string;
  colorAlt: string;
  logo?: string;
};

const REGIONS: Region[] = ["All Regions", "North America", "Europe", "Asia-Pacific"];

/**
 * Geographic calibration for the supplied illustrated map.
 *
 * Each pair is [real longitude/latitude, image percentage]. Interpolating
 * between geographic control lines gives every school the same projection;
 * individual pins are never nudged away from their real campus coordinates.
 */
const LONGITUDE_GRID: ReadonlyArray<readonly [number, number]> = [
  [-180, 2],
  [-122, 11.5],
  [-79, 18.8],
  [-74, 19.8],
  [0, 33],
  [104, 53],
  [116, 56.5],
  [127, 59.5],
  [140, 62.2],
  [151, 62.5],
  [180, 68],
];

const LATITUDE_GRID: ReadonlyArray<readonly [number, number]> = [
  [-60, 76],
  [-38, 70.5],
  [-34, 69],
  [0, 53.5],
  [35, 40.5],
  [40, 38.5],
  [44, 36.8],
  [52, 34],
  [75, 23],
  [90, 18],
];

const LONGITUDE_GUIDES = [-120, -60, 0, 60, 120];
const LATITUDE_GUIDES = [60, 30, 0, -30, -60];

const MAP_BOUNDS = {
  left: LONGITUDE_GRID[0]![1],
  right: LONGITUDE_GRID[LONGITUDE_GRID.length - 1]![1],
  top: LATITUDE_GRID[LATITUDE_GRID.length - 1]![1],
  bottom: LATITUDE_GRID[0]![1],
};

function interpolateGrid(value: number, grid: ReadonlyArray<readonly [number, number]>): number {
  const bounded = Math.max(grid[0]![0], Math.min(grid[grid.length - 1]![0], value));
  for (let index = 1; index < grid.length; index += 1) {
    const [rightValue, rightPosition] = grid[index]!;
    const [leftValue, leftPosition] = grid[index - 1]!;
    if (bounded <= rightValue) {
      const progress = (bounded - leftValue) / (rightValue - leftValue);
      return leftPosition + (rightPosition - leftPosition) * progress;
    }
  }
  return grid[grid.length - 1]![1];
}

function projectSchoolLocation(school: MapSchool): { x: number; y: number } {
  const longitude = school.longitude ?? 0;
  const latitude = school.latitude ?? 0;
  return {
    x: interpolateGrid(longitude, LONGITUDE_GRID),
    y: interpolateGrid(latitude, LATITUDE_GRID),
  };
}

function invertGrid(position: number, grid: ReadonlyArray<readonly [number, number]>): number {
  for (let index = 1; index < grid.length; index += 1) {
    const [leftValue, leftPosition] = grid[index - 1]!;
    const [rightValue, rightPosition] = grid[index]!;
    const segmentStart = Math.min(leftPosition, rightPosition);
    const segmentEnd = Math.max(leftPosition, rightPosition);
    if (position >= segmentStart && position <= segmentEnd) {
      const progress = (position - leftPosition) / (rightPosition - leftPosition);
      return leftValue + (rightValue - leftValue) * progress;
    }
  }

  const first = grid[0]!;
  const last = grid[grid.length - 1]!;
  return Math.abs(position - first[1]) <= Math.abs(position - last[1]) ? first[0] : last[0];
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

function regionForSchool(school: SchoolListItem): Exclude<Region, "All Regions"> {
  const countryCode = school.location?.countryCode ?? "";
  if (EUROPE_COUNTRY_CODES.has(countryCode)) return "Europe";
  if (["US", "CA", "MX"].includes(countryCode)) return "North America";
  if ((school.location?.longitude ?? 0) < -30) return "North America";
  return "Asia-Pacific";
}

function registeredMapSchool(school: SchoolListItem): MapSchool | null {
  if (!school.location) return null;
  const works = school.workCount ?? 0;
  return {
    id: school.id,
    name: school.shortName || school.name,
    short: school.initials,
    count: works > 0 ? `${works} works` : "New",
    countDetail: works > 0 ? `${works} published works` : "Newly registered school",
    students: 0,
    region: regionForSchool(school),
    latitude: school.location.latitude,
    longitude: school.location.longitude,
    labelSide: school.location.longitude > 115 ? "left" : "right",
    color: school.colorPrimary,
    colorAlt: school.colorSecondary,
    logo: school.logoUrl ?? undefined,
  };
}

const SCHOOLS: MapSchool[] = [
  { id: "penn-state", name: "Penn State", short: "PS", count: "2.3K", students: 2300, region: "North America", latitude: 40.7982, longitude: -77.8599, labelSide: "left", labelOffset: { x: -3, y: 24 }, color: "#123c88", colorAlt: "#eef4ff", logo: "/images/campus/schools/psu.png" },
  { id: "snu", name: "SNU", short: "SNU", count: "1.9K", students: 1900, region: "Asia-Pacific", latitude: 37.4599, longitude: 126.9519, labelSide: "right", labelOffset: { x: 2, y: 19 }, color: "#4564a8", colorAlt: "#f4f6ff" },
  { id: "ucla", name: "UCLA", short: "UCLA", count: "1.8K", students: 1800, region: "North America", latitude: 34.0689, longitude: -118.4452, labelSide: "left", color: "#1f78bc", colorAlt: "#f5c449", logo: "/images/campus/schools/ucla.svg" },
  { id: "pku", name: "PKU", short: "PKU", count: "1.5K", students: 1500, region: "Asia-Pacific", latitude: 39.9927, longitude: 116.3054, markerOffset: { x: -5, y: 3 }, labelSide: "left", labelOffset: { y: -9 }, color: "#8d1838", colorAlt: "#fff4f6" },
  { id: "nyu", name: "NYU", short: "NYU", count: "1.4K", students: 1400, region: "North America", latitude: 40.7295, longitude: -73.9965, labelSide: "right", labelOffset: { x: 3, y: 21 }, color: "#5d2ca8", colorAlt: "#f6f0ff", logo: "/images/campus/schools/nyu.svg" },
  { id: "tokyo", name: "University of Tokyo", short: "UT", count: "1.3K", students: 1300, region: "Asia-Pacific", latitude: 35.7126, longitude: 139.761, labelSide: "left", labelOffset: { x: -2, y: 28 }, color: "#dfa800", colorAlt: "#1d62a5" },
  { id: "tsinghua", name: "Tsinghua", short: "TH", count: "1.2K", students: 1200, region: "Asia-Pacific", latitude: 40.0004, longitude: 116.326, markerOffset: { x: 5, y: -3 }, labelSide: "right", labelOffset: { y: -13 }, color: "#c86ebc", colorAlt: "#fff4ff" },
  { id: "berkeley", name: "UC Berkeley", short: "CAL", count: "1.1K", students: 1100, region: "North America", latitude: 37.8719, longitude: -122.2585, labelSide: "left", color: "#9b6c10", colorAlt: "#f2c84b", logo: "/images/campus/schools/berkeley.svg" },
  { id: "toronto", name: "University of Toronto", short: "U of T", count: "1.1K", students: 1080, region: "North America", latitude: 43.6629, longitude: -79.3957, labelSide: "above", labelOffset: { x: -42, y: -22 }, color: "#1555a4", colorAlt: "#dcecff" },
  { id: "melbourne", name: "University of Melbourne", short: "UM", count: "1.0K", students: 1000, region: "Asia-Pacific", latitude: -37.7983, longitude: 144.961, labelSide: "left", color: "#174784", colorAlt: "#eaf2ff" },
  { id: "oxford", name: "University of Oxford", short: "OX", count: "930", students: 930, region: "Europe", latitude: 51.7548, longitude: -1.2544, labelSide: "left", color: "#1c477a", colorAlt: "#e2edf8" },
  { id: "nus", name: "National University of Singapore", short: "NUS", count: "920", students: 920, region: "Asia-Pacific", latitude: 1.2966, longitude: 103.7764, labelSide: "left", color: "#ef7c18", colorAlt: "#163b80" },
  { id: "sydney", name: "University of Sydney", short: "USYD", count: "870", students: 870, region: "Asia-Pacific", latitude: -33.8886, longitude: 151.1873, labelSide: "right", labelOffset: { x: 2, y: 17 }, color: "#a4142e", colorAlt: "#fff0f2" },
  { id: "mit", name: "MIT", short: "MIT", count: "820", students: 820, region: "North America", latitude: 42.3601, longitude: -71.0942, labelSide: "right", labelOffset: { x: 8, y: -27 }, color: "#8d2837", colorAlt: "#f4e7e9" },
  { id: "mcgill", name: "McGill University", short: "MCG", count: "620", students: 620, region: "North America", latitude: 45.5048, longitude: -73.5772, labelSide: "left", labelOffset: { x: -4, y: -4 }, color: "#ba2636", colorAlt: "#ffffff" },
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
  const [coordinateGuide, setCoordinateGuide] = useState(true);
  const [cursorCoordinate, setCursorCoordinate] = useState<{
    x: number;
    y: number;
    latitude: number;
    longitude: number;
  } | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const { items: registeredSchools } = useSchoolsFeed(50);

  const allSchools = useMemo(() => {
    const featuredIds = new Set(SCHOOLS.map((school) => school.id));
    const featuredNames = new Set(SCHOOLS.map((school) => school.name.trim().toLowerCase()));
    const additions = registeredSchools.flatMap((school) => {
      if (featuredIds.has(school.id) || featuredNames.has(school.name.trim().toLowerCase())) return [];
      const mapped = registeredMapSchool(school);
      return mapped ? [mapped] : [];
    });
    return [...SCHOOLS, ...additions];
  }, [registeredSchools]);

  const filteredSchools = useMemo(
    () => allSchools.filter((school) => region === "All Regions" || school.region === region),
    [allSchools, region]
  );
  const mapSchools = filteredSchools.filter((school) => school.latitude !== undefined && school.longitude !== undefined);
  const rankedSchools = showAll ? filteredSchools : filteredSchools.slice(0, 10);
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
    if (!coordinateGuide) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    if (x < MAP_BOUNDS.left || x > MAP_BOUNDS.right || y < MAP_BOUNDS.top || y > MAP_BOUNDS.bottom) {
      setCursorCoordinate(null);
      return;
    }
    setCursorCoordinate({
      x,
      y,
      latitude: invertGrid(y, LATITUDE_GRID),
      longitude: invertGrid(x, LONGITUDE_GRID),
    });
  }

  return (
    <div className="nr">
      <main className="atlas-shell">
        <section
          className="map-panel"
          aria-label="Interactive global school map"
          onPointerMove={inspectCoordinate}
          onPointerDown={inspectCoordinate}
          onPointerLeave={() => setCursorCoordinate(null)}
        >
          <div className="map-shade" aria-hidden="true" />

          <div className="schools-intro">
            <h1>Student creators</h1>
            <p>A global community. A thousand voices.</p>

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

              <button
                type="button"
                className={`coordinate-toggle${coordinateGuide ? " active" : ""}`}
                aria-pressed={coordinateGuide}
                onClick={() => {
                  setCoordinateGuide((visible) => !visible);
                  setCursorCoordinate(null);
                }}
              >
                <span className="coordinate-toggle-dot" aria-hidden="true" />
                Coordinate guide
              </button>
            </div>
          </div>

          {coordinateGuide ? (
            <div className="coordinate-guide" aria-hidden="true">
              <div
                className="coordinate-frame"
                style={{
                  left: `${MAP_BOUNDS.left}%`,
                  top: `${MAP_BOUNDS.top}%`,
                  width: `${MAP_BOUNDS.right - MAP_BOUNDS.left}%`,
                  height: `${MAP_BOUNDS.bottom - MAP_BOUNDS.top}%`,
                }}
              >
                <span>Calibrated map area</span>
              </div>

              {LONGITUDE_GUIDES.map((longitude) => (
                <div
                  key={`longitude-${longitude}`}
                  className="coordinate-line longitude-line"
                  style={
                    {
                      "--guide-position": `${interpolateGrid(longitude, LONGITUDE_GRID)}%`,
                      "--guide-start": `${MAP_BOUNDS.top}%`,
                      "--guide-size": `${MAP_BOUNDS.bottom - MAP_BOUNDS.top}%`,
                    } as CSSProperties
                  }
                >
                  <span>{formatGuideDegree(longitude, "E", "W")}</span>
                </div>
              ))}

              {LATITUDE_GUIDES.map((latitude) => (
                <div
                  key={`latitude-${latitude}`}
                  className="coordinate-line latitude-line"
                  style={
                    {
                      "--guide-position": `${interpolateGrid(latitude, LATITUDE_GRID)}%`,
                      "--guide-start": `${MAP_BOUNDS.left}%`,
                      "--guide-size": `${MAP_BOUNDS.right - MAP_BOUNDS.left}%`,
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
                    <small>image {cursorCoordinate.x.toFixed(2)}%, {cursorCoordinate.y.toFixed(2)}%</small>
                  </output>
                </>
              ) : (
                <div className="coordinate-hint">Move across the framed map to inspect coordinates</div>
              )}
            </div>
          ) : null}

          <div className="hotspot-layer">
            {mapSchools.map((school) => {
              const point = projectSchoolLocation(school);
              const style = {
                "--x": `${point.x}%`,
                "--y": `${point.y}%`,
                "--marker-x": `${school.markerOffset?.x ?? 0}px`,
                "--marker-y": `${school.markerOffset?.y ?? 0}px`,
                "--label-x": `${school.labelOffset?.x ?? 0}px`,
                "--label-y": `${school.labelOffset?.y ?? 0}px`,
              } as CSSProperties;
              return (
                <button
                  key={school.id}
                  type="button"
                  className={`hotspot label-${school.labelSide ?? "right"}${selectedId === school.id ? " active" : ""}`}
                  style={style}
                  data-latitude={school.latitude}
                  data-longitude={school.longitude}
                  aria-label={`${school.name}, ${school.countDetail ?? `${school.count} student creators`}`}
                  aria-pressed={selectedId === school.id}
                  onClick={() => chooseSchool(school.id)}
                >
                  <span className="pin-halo" aria-hidden="true" />
                  <span className="pin-core" aria-hidden="true" />
                  <span className="hotspot-label">
                    <strong>{school.name}</strong>
                    <small>{school.count}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <aside className="legend" aria-label="Student creator legend">
            <p>Number of student creators</p>
            <div className="legend-line"><i className="legend-orb orb-xl" /><span>2.0K+</span></div>
            <div className="legend-line"><i className="legend-orb orb-lg" /><span>1.0K – 2.0K</span></div>
            <div className="legend-line"><i className="legend-orb orb-md" /><span>500 – 1.0K</span></div>
            <div className="legend-line"><i className="legend-orb orb-sm" /><span>&lt; 500</span></div>
          </aside>
        </section>

        <aside className="ranking-rail" aria-label="Schools on OONA">
          <div className="ranking-head"><h2>Schools on OONA</h2></div>

          <ol className="ranking-list">
            {rankedSchools.map((school) => {
              const originalRank = allSchools.findIndex((item) => item.id === school.id) + 1;
              return (
                <li key={school.id}>
                  <button
                    type="button"
                    className={`rank-row${selectedId === school.id ? " active" : ""}`}
                    onClick={() => chooseSchool(school.id)}
                    aria-pressed={selectedId === school.id}
                  >
                    <span className="rank-number">{originalRank}</span>
                    <SchoolCrest school={school} />
                    <span className="rank-school-info">
                      <span className="rank-name">{school.name}</span>
                      {coordinateGuide && school.latitude !== undefined && school.longitude !== undefined ? (
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
