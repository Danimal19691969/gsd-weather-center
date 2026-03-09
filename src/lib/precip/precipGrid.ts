export const MAX_GRID_CELLS = 200;

export interface GridPoint {
  lat: number;
  lon: number;
}

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function getGridResolution(zoom: number): number {
  if (zoom < 4) return 2;
  if (zoom < 6) return 1;
  return 0.5;
}

export function generateGridPoints(
  bounds: ViewportBounds,
  zoom: number
): GridPoint[] {
  const resolution = getGridResolution(zoom);
  const points: GridPoint[] = [];

  // Snap bounds to grid
  const startLat = Math.ceil(bounds.south / resolution) * resolution;
  const startLon = Math.ceil(bounds.west / resolution) * resolution;

  for (let lat = startLat; lat <= bounds.north; lat += resolution) {
    for (let lon = startLon; lon <= bounds.east; lon += resolution) {
      points.push({
        lat: Math.round(lat * 10) / 10,
        lon: Math.round(lon * 10) / 10,
      });
      if (points.length >= MAX_GRID_CELLS) return points;
    }
  }

  return points;
}

export function gridCacheKey(lat: number, lon: number): string {
  const rLat = Math.round(lat * 10) / 10;
  const rLon = Math.round(lon * 10) / 10;
  return `${rLat}_${rLon}`;
}
