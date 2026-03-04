import { NextRequest, NextResponse } from "next/server";
import {
  getNearbyBuoys,
  getBuoyObservations,
  getBuoyHistory,
} from "@/lib/tools/buoys";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tool = searchParams.get("tool");
  if (!tool || !["nearby", "observations", "history"].includes(tool)) {
    return NextResponse.json(
      { success: false, error: "Invalid tool. Must be: nearby, observations, history", source: "api" },
      { status: 400 }
    );
  }

  let result;

  if (tool === "nearby") {
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    if (!latStr || !lonStr) {
      return NextResponse.json(
        { success: false, error: "lat and lon are required for nearby", source: "api" },
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
    const radius = searchParams.get("radius") ? parseFloat(searchParams.get("radius")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    result = await getNearbyBuoys(lat, lon, radius, limit);
  } else {
    const stationId = searchParams.get("stationId");
    if (!stationId) {
      return NextResponse.json(
        { success: false, error: "stationId is required for observations/history", source: "api" },
        { status: 400 }
      );
    }
    result = tool === "observations"
      ? await getBuoyObservations(stationId)
      : await getBuoyHistory(stationId);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
