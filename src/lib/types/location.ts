export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GeocodingResult {
  placeName: string;
  coordinates: Coordinates;
  relevance: number;
  context: {
    city?: string;
    region?: string;
    country?: string;
  };
}
