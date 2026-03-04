import { NextRequest, NextResponse } from "next/server";
import { resolveLocation } from "@/lib/tools/location";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "q (query) parameter is required", source: "api" },
      { status: 400 }
    );
  }

  const result = await resolveLocation(query);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=86400" },
  });
}
