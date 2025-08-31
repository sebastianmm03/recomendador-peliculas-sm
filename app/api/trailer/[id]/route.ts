import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/app/lib/tmdb";

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        let data = await tmdb(`/movie/${id}/videos`, { language: "es-MX" });
        if (!data.results?.length) {
            data = await tmdb(`/movie/${id}/videos`, { language: "en-US" });
        }

        // Busca el mejor tráiler de YouTube
        type tmdbVideo = {
            site: string;
            type: string;
            key: string;
            official?: boolean;
        };

        const results: tmdbVideo[] = data.results ?? [];

        const trailer =
            results.find(
                (v) =>
                    v.site === "YouTube" &&
                    v.type === "Trailer" &&
                    (v.official ?? true)
            ) || null;

        return NextResponse.json({
            site: trailer?.site ?? null,
            key: trailer?.key ?? null,
        });
    } catch (e) {
        const err = e as Error;
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
