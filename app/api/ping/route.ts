import { NextResponse } from "next/server";
import { tmdb } from "@/app/lib/tmdb";

export async function GET() {

    const data = await tmdb("/trending/movie/day", {})

    return NextResponse.json(data)

}