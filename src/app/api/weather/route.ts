import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentWeather,
  getForecast,
  getMarineWeather,
} from "@/lib/tools/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tool = searchParams.get("tool");
  if (!tool || !["current", "forecast", "marine"].includes(tool)) {
    return NextResponse.json(
      { success: false, error: "Invalid tool. Must be: current, forecast, marine", source: "api" },
      { status: 400 }
    );
  }

  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  if (!latStr || !lonStr) {
    return NextResponse.json(
      { success: false, error: "lat and lon are required", source: "api" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { success: false, error: "lat must be -90..90, lon must be -180..180", source: "api" },
      { status: 400 }
    );
  }

  let result;

  if (tool === "current") {
    result = await getCurrentWeather(lat, lon);
  } else if (tool === "forecast") {
    const type = searchParams.get("type");
    if (!type || !["hourly", "daily"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type must be 'hourly' or 'daily' for forecast", source: "api" },
        { status: 400 }
      );
    }
    result = await getForecast(lat, lon, type as "hourly" | "daily");
  } else {
    result = await getMarineWeather(lat, lon);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
