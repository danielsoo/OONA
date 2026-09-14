import worldData from "@/data/natural-earth-countries-110m.json";

export const GEO_MAP = {
  latitudeTop: 90,
  latitudeBottom: -60,
  longitudeLeft: -180,
  longitudeRight: 180,
  width: 1440,
  height: 600,
} as const;

export type GeoViewport = {
  latitudeTop: number;
  latitudeBottom: number;
  longitudeLeft: number;
  longitudeRight: number;
};

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

export function projectGeoCoordinate(
  latitude: number,
  longitude: number,
  viewport: GeoViewport = GEO_MAP
) {
  const boundedLatitude = Math.max(viewport.latitudeBottom, Math.min(viewport.latitudeTop, latitude));
  const boundedLongitude = Math.max(viewport.longitudeLeft, Math.min(viewport.longitudeRight, longitude));
  return {
    x: ((boundedLongitude - viewport.longitudeLeft) / (viewport.longitudeRight - viewport.longitudeLeft)) * 100,
    y: ((viewport.latitudeTop - boundedLatitude) / (viewport.latitudeTop - viewport.latitudeBottom)) * 100,
  };
}

export function unprojectGeoCoordinate(x: number, y: number, viewport: GeoViewport = GEO_MAP) {
  return {
    longitude: viewport.longitudeLeft + (x / 100) * (viewport.longitudeRight - viewport.longitudeLeft),
    latitude: viewport.latitudeTop - (y / 100) * (viewport.latitudeTop - viewport.latitudeBottom),
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

function viewportViewBox(viewport: GeoViewport) {
  const [x, y] = projectPoint([viewport.longitudeLeft, viewport.latitudeTop]);
  const [right, bottom] = projectPoint([viewport.longitudeRight, viewport.latitudeBottom]);
  return { x, y, width: right - x, height: bottom - y };
}

export default function GeoWorldMap({
  showAdminOutlines = false,
  viewport = GEO_MAP,
}: {
  showAdminOutlines?: boolean;
  viewport?: GeoViewport;
}) {
  const frame = viewportViewBox(viewport);

  return (
    <svg
      className="geo-world-map"
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="oona-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#214f6b" />
          <stop offset="0.46" stopColor="#0d334b" />
          <stop offset="1" stopColor="#041925" />
        </linearGradient>
        <linearGradient id="oona-land-volume" x1="0" y1="0" x2="0.72" y2="1">
          <stop offset="0" stopColor="#78a9c3" stopOpacity="0.62" />
          <stop offset="0.27" stopColor="#28627f" stopOpacity="0.36" />
          <stop offset="0.66" stopColor="#0b2c42" stopOpacity="0.18" />
          <stop offset="1" stopColor="#00070d" stopOpacity="0.48" />
        </linearGradient>
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
        <filter id="oona-land-aura" x="-8%" y="-16%" width="116%" height="132%">
          <feGaussianBlur stdDeviation="5.5" />
        </filter>
      </defs>

      <g className="geo-world-aura" filter="url(#oona-land-aura)">
        {countryPaths.map((country) => <path key={`aura-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-depth geo-world-depth-back" transform="translate(0 9)">
        {countryPaths.map((country) => <path key={`depth-back-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-depth geo-world-depth-front" transform="translate(0 4)">
        {countryPaths.map((country) => <path key={`depth-front-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-foundation">
        {countryPaths.map((country) => <path key={`foundation-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-surface" clipPath="url(#oona-land-clip)">
        <image
          className="geo-world-terrain-texture"
          href="/images/schools/oona-society-land-v3.jpg"
          x={frame.x}
          y={frame.y}
          width={frame.width}
          height={frame.height}
          preserveAspectRatio="none"
        />
        <rect
          className="geo-world-volume"
          x={frame.x}
          y={frame.y}
          width={frame.width}
          height={frame.height}
          fill="url(#oona-land-volume)"
        />
      </g>
      <g className="geo-world-rim">
        {countryPaths.map((country) => <path key={`rim-${country.key}`} d={country.path} />)}
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
