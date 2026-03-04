import type { ToolResult } from "@/lib/types/tool-result";
import type { GeocodingResult } from "@/lib/types/location";
import { cachedFetch } from "@/lib/cache";

const MAPBOX_GEOCODING_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

interface MapboxFeature {
  place_name: string;
  center: [number, number];
  relevance: number;
  context?: Array<{ id: string; text: string }>;
}

export async function resolveLocation(
  query: string
): Promise<ToolResult<GeocodingResult[]>> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return {
      success: false,
      error: "Mapbox token not configured",
      source: "mapbox",
    };
  }

  try {
    const encoded = encodeURIComponent(query);
    const json = await cachedFetch(
      `location:resolve:${query}`,
      async () => {
        const res = await fetch(
          `${MAPBOX_GEOCODING_BASE}/${encoded}.json?access_token=${token}&limit=5`
        );
        if (!res.ok) throw new Error(`Mapbox returned ${res.status}: ${res.statusText}`);
        return res.json();
      },
      86_400_000 // 24 hours
    );
    const features: MapboxFeature[] = json.features ?? [];

    const results: GeocodingResult[] = features.map((f) => {
      const context: GeocodingResult["context"] = {};
      if (f.context) {
        for (const ctx of f.context) {
          const type = ctx.id.split(".")[0];
          if (type === "place") context.city = ctx.text;
          else if (type === "region") context.region = ctx.text;
          else if (type === "country") context.country = ctx.text;
        }
      }

      return {
        placeName: f.place_name,
        coordinates: {
          lat: f.center[1],
          lon: f.center[0],
        },
        relevance: f.relevance,
        context,
      };
    });

    return { success: true, data: results };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "mapbox",
    };
  }
}
