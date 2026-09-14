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
type CountryFeature = { geometry: CountryGeometry | null };
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
  feature.geometry ? [{ key: index, path: geometryPath(feature.geometry) }] : []
);

export default function GeoWorldMap() {
  return (
    <svg
      className="geo-world-map"
      viewBox={`0 0 ${GEO_MAP.width} ${GEO_MAP.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="oona-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10283d" />
          <stop offset="0.58" stopColor="#071a29" />
          <stop offset="1" stopColor="#04111d" />
        </linearGradient>
        <filter id="oona-coast-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="geo-world-glow" filter="url(#oona-coast-glow)">
        {countryPaths.map((country) => <path key={`glow-${country.key}`} d={country.path} />)}
      </g>
      <g className="geo-world-countries">
        {countryPaths.map((country) => <path key={country.key} d={country.path} />)}
      </g>
    </svg>
  );
}
