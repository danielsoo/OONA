import worldData from "@/data/natural-earth-countries-110m.json";

export const GEO_MAP = {
  latitudeTop: 90,
  latitudeBottom: -60,
  longitudeLeft: -180,
  longitudeRight: 180,
  width: 1440,
  height: 600,
} as const;

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];
type CountryGeometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };
type CountryFeature = {
  geometry: CountryGeometry | null;
  properties?: { ADMIN?: string };
};
type CountryCollection = { features: CountryFeature[] };

export function projectGeoCoordinate(latitude: number, longitude: number) {
  const boundedLatitude = Math.max(GEO_MAP.latitudeBottom, Math.min(GEO_MAP.latitudeTop, latitude));
  const boundedLongitude = Math.max(GEO_MAP.longitudeLeft, Math.min(GEO_MAP.longitudeRight, longitude));
  return {
    x: ((boundedLongitude - GEO_MAP.longitudeLeft) / (GEO_MAP.longitudeRight - GEO_MAP.longitudeLeft)) * 100,
    y: ((GEO_MAP.latitudeTop - boundedLatitude) / (GEO_MAP.latitudeTop - GEO_MAP.latitudeBottom)) * 100,
  };
}

export function unprojectGeoCoordinate(x: number, y: number) {
  return {
    longitude: GEO_MAP.longitudeLeft + (x / 100) * (GEO_MAP.longitudeRight - GEO_MAP.longitudeLeft),
    latitude: GEO_MAP.latitudeTop - (y / 100) * (GEO_MAP.latitudeTop - GEO_MAP.latitudeBottom),
  };
}

function projectPoint([longitude, latitude]: Position): [number, number] {
  return [
    ((longitude - GEO_MAP.longitudeLeft) / (GEO_MAP.longitudeRight - GEO_MAP.longitudeLeft)) * GEO_MAP.width,
    ((GEO_MAP.latitudeTop - latitude) / (GEO_MAP.latitudeTop - GEO_MAP.latitudeBottom)) * GEO_MAP.height,
  ];
}

function ringPath(ring: Position[]): string {
  return `${ring
    .map((point, index) => {
      const [x, y] = projectPoint(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ")} Z`;
}

function polygonPath(polygon: PolygonCoordinates): string {
  return polygon.map(ringPath).join(" ");
}

function geometryPath(geometry: CountryGeometry): string {
  if (geometry.type === "Polygon") return polygonPath(geometry.coordinates);
  return geometry.coordinates.map(polygonPath).join(" ");
}

const countryPaths = (worldData as unknown as CountryCollection).features.flatMap((feature, index) =>
  feature.geometry && feature.properties?.ADMIN !== "Antarctica"
    ? [{ key: index, path: geometryPath(feature.geometry) }]
    : []
);

export default function GeoWorldMap({ showAdminOutlines = false }: { showAdminOutlines?: boolean }) {
  return (
    <svg
      className="geo-world-map"
      viewBox={`0 0 ${GEO_MAP.width} ${GEO_MAP.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="oona-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3a50" />
          <stop offset="0.48" stopColor="#0b2435" />
          <stop offset="1" stopColor="#03121e" />
        </linearGradient>
        <linearGradient id="oona-land-volume" x1="0" y1="0" x2="0.72" y2="1">
          <stop offset="0" stopColor="#6f93a8" stopOpacity="0.38" />
          <stop offset="0.27" stopColor="#1b435b" stopOpacity="0.2" />
          <stop offset="0.66" stopColor="#061723" stopOpacity="0.08" />
          <stop offset="1" stopColor="#00070d" stopOpacity="0.48" />
        </linearGradient>
        <radialGradient id="oona-city-glow">
          <stop offset="0" stopColor="#eaf8ff" stopOpacity="0.72" />
          <stop offset="0.18" stopColor="#91d4ff" stopOpacity="0.34" />
          <stop offset="0.62" stopColor="#2c8dd0" stopOpacity="0.1" />
          <stop offset="1" stopColor="#0b304d" stopOpacity="0" />
        </radialGradient>
        <pattern id="oona-city-dots" width="41" height="31" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="8" r="1.15" fill="#eaf8ff" opacity="0.34" />
          <circle cx="29" cy="18" r="0.72" fill="#8bd3ff" opacity="0.3" />
          <circle cx="16" cy="27" r="0.52" fill="#d9f3ff" opacity="0.22" />
        </pattern>
        <clipPath id="oona-land-clip">
          {countryPaths.map((country) => <path key={`clip-${country.key}`} d={country.path} />)}
        </clipPath>
        <filter id="oona-coast-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="oona-land-relief" x="-8%" y="-12%" width="116%" height="132%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.013 0.032"
            numOctaves="3"
            seed="17"
            result="terrain"
          />
          <feDiffuseLighting
            in="terrain"
            surfaceScale="10"
            diffuseConstant="0.68"
            lightingColor="#7da6bc"
            result="terrainLight"
          >
            <feDistantLight azimuth="225" elevation="54" />
          </feDiffuseLighting>
          <feComposite in="terrainLight" in2="SourceAlpha" operator="in" result="litTerrain" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="shadowBlur" />
          <feOffset in="shadowBlur" dx="0" dy="7" result="shadowOffset" />
          <feFlood floodColor="#000309" floodOpacity="0.96" result="shadowColor" />
          <feComposite in="shadowColor" in2="shadowOffset" operator="in" result="landShadow" />
          <feMerge>
            <feMergeNode in="landShadow" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="litTerrain" />
          </feMerge>
        </filter>
      </defs>

      <g className="geo-world-foundation">
        {countryPaths.map((country) => <path key={`foundation-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-relief" filter="url(#oona-land-relief)">
        {countryPaths.map((country) => <path key={`relief-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-surface" clipPath="url(#oona-land-clip)">
        <rect className="geo-world-volume" width={GEO_MAP.width} height={GEO_MAP.height} fill="url(#oona-land-volume)" />
        <image
          className="geo-world-land-texture"
          href="/images/schools/oona-world-map-v1.png"
          x="-20"
          y="-160"
          width="2090"
          height="1026"
          preserveAspectRatio="none"
        />
      </g>
      <g className="geo-world-lighting" clipPath="url(#oona-land-clip)">
        <rect width={GEO_MAP.width} height={GEO_MAP.height} fill="url(#oona-city-dots)" />
        <circle cx="310" cy="205" r="185" fill="url(#oona-city-glow)" />
        <circle cx="715" cy="175" r="120" fill="url(#oona-city-glow)" />
        <circle cx="1155" cy="210" r="170" fill="url(#oona-city-glow)" />
        <circle cx="1125" cy="340" r="105" fill="url(#oona-city-glow)" />
        <circle cx="1305" cy="480" r="115" fill="url(#oona-city-glow)" />
        <circle cx="495" cy="405" r="105" fill="url(#oona-city-glow)" />
      </g>
      {showAdminOutlines ? (
        <>
          <g className="geo-world-glow" filter="url(#oona-coast-glow)">
            {countryPaths.map((country) => <path key={`glow-${country.key}`} d={country.path} />)}
          </g>
          <g className="geo-world-outline">
            {countryPaths.map((country) => <path key={`outline-${country.key}`} d={country.path} />)}
          </g>
        </>
      ) : null}
    </svg>
  );
}
