import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/app/lib/tmdb";

type Answers = {
    mood: "ligero" | "intenso" | "romantico" | "suspenso" | "terror" | "aventura" | "";
    energy: "baja" | "media" | "alta" | "";
}

type DiscoverParams = Record<string, string | number | boolean>;

function answersToParams(a: Answers): DiscoverParams {
    const p: DiscoverParams = {
        sort_by: "popularity.desc",
        include_adult: false,
        "vote_count.gte": 200,
    };

    switch (a.mood) {
        case "ligero": p.with_genres = "35"; break;          // comedia
        case "romantico": p.with_genres = "10749"; break;       // romance
        case "terror": p.with_genres = "27"; break;          // horror
        case "suspenso": p.with_genres = "53"; break;          // suspenso
        case "aventura": p.with_genres = "12,28"; break;       // aventura+acción
        case "intenso": p["vote_average.gte"] = 7; break;     // prioriza nota media mas alta
    }

    if (a.energy === "baja") {
        p.sort_by = "popularity.desc";
    }
    if (a.energy === "media") {
    }
    if (a.energy === "alta") {
        p.sort_by = "vote_average.desc";       // las mejor valoradas primero
        const min = Number(p["vote_average.gte"] ?? 0);
        p["vote_average.gte"] = Math.max(min, 7.3);
    }

    return p;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Answers & { page?: number };
        const params = answersToParams(body);
        const page = Math.max(1, Math.min(Number(body.page || 1), 500));
        const data = await tmdb("/discover/movie", { ...params, page });
        return NextResponse.json({
            params, page: data.page, total_pages: data.total_pages, results: data.results,
        });
    } catch (e) {
        const err = e as Error;
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}