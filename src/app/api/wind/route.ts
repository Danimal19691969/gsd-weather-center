import { NextRequest, NextResponse } from "next/server";
import { fetchWindGrid } from "@/lib/tools/wind";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const west = parseFloat(searchParams.get("west") ?? "");
    const south = parseFloat(searchParams.get("south") ?? "");
    const east = parseFloat(searchParams.get("east") ?? "");
    const north = parseFloat(searchParams.get("north") ?? "");

    if ([west, south, east, north].some(isNaN)) {
      return NextResponse.json(
        { success: false, error: "west, south, east, north are required" },
        { status: 400 }
      );
    }

    const clampedWest = Math.max(-180, west);
    const clampedEast = Math.min(180, east);
    const clampedSouth = Math.max(-90, south);
    const clampedNorth = Math.min(90, north);

    const grid = await fetchWindGrid({ west: clampedWest, south: clampedSouth, east: clampedEast, north: clampedNorth });
    return NextResponse.json(
      {
        success: true,
        data: {
          ...grid,
          u: Array.from(grid.u),
          v: Array.from(grid.v),
          speed: Array.from(grid.speed),
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (error) {
    console.error("WIND API ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Wind service temporarily unavailable" },
      { status: 500 }
    );
  }
}
