import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { getCurrentWeather, getForecast, getMarineWeather } from "@/lib/tools/weather";
import { getNearbyBuoys, getBuoyObservations, getBuoyHistory } from "@/lib/tools/buoys";
import { resolveLocation } from "@/lib/tools/location";

export const weatherTools: Tool[] = [
  {
    name: "get_current_weather",
    description: "Get current weather conditions for a location. Returns temperature, humidity, wind, pressure, UV index, and more.",
    input_schema: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
      },
      required: ["lat", "lon"],
    },
  },
  {
    name: "get_forecast",
    description: "Get weather forecast for a location. Use type 'daily' for 7-day forecast or 'hourly' for 48-hour forecast.",
    input_schema: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
        type: { type: "string", enum: ["daily", "hourly"], description: "Forecast type" },
      },
      required: ["lat", "lon", "type"],
    },
  },
  {
    name: "get_marine_weather",
    description: "Get marine/ocean weather conditions including wave height, swell, and sea surface temperature.",
    input_schema: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
      },
      required: ["lat", "lon"],
    },
  },
  {
    name: "get_nearby_buoys",
    description: "Find NOAA buoy stations near a location. Returns station names, IDs, and distances.",
    input_schema: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
        radius: { type: "number", description: "Search radius in miles (default 100)" },
      },
      required: ["lat", "lon"],
    },
  },
  {
    name: "get_buoy_observations",
    description: "Get the latest observation from a NOAA buoy station. Returns wave height, wind, water temp, pressure, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        stationId: { type: "string", description: "NOAA buoy station ID (e.g., '46029')" },
      },
      required: ["stationId"],
    },
  },
  {
    name: "get_buoy_history",
    description: "Get the last 24 hours of observations from a NOAA buoy station.",
    input_schema: {
      type: "object" as const,
      properties: {
        stationId: { type: "string", description: "NOAA buoy station ID" },
      },
      required: ["stationId"],
    },
  },
  {
    name: "resolve_location",
    description: "Convert a place name, city, or zip code into coordinates. Use this when the user mentions a location by name.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Location name, city, or zip code" },
      },
      required: ["query"],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_current_weather":
      return JSON.stringify(await getCurrentWeather(input.lat as number, input.lon as number));
    case "get_forecast":
      return JSON.stringify(
        await getForecast(input.lat as number, input.lon as number, input.type as "daily" | "hourly")
      );
    case "get_marine_weather":
      return JSON.stringify(await getMarineWeather(input.lat as number, input.lon as number));
    case "get_nearby_buoys":
      return JSON.stringify(
        await getNearbyBuoys(input.lat as number, input.lon as number, (input.radius as number) ?? 100)
      );
    case "get_buoy_observations":
      return JSON.stringify(await getBuoyObservations(input.stationId as string));
    case "get_buoy_history":
      return JSON.stringify(await getBuoyHistory(input.stationId as string));
    case "resolve_location":
      return JSON.stringify(await resolveLocation(input.query as string));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
