import { NextResponse } from "next/server"

import { locateCity } from "@/lib/city-location"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const city = url.searchParams.get("city")?.trim() || ""
  const country = url.searchParams.get("country")?.trim() || ""
  const match = locateCity(city, country)
  return NextResponse.json(match ?? { latitude: null, longitude: null })
}
