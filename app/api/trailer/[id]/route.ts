import { NextRequest, NextResponse } from "next/server";

type TmdbVideo = {
    site: string;        // "YouTube"
    type: string;        // "Trailer" | "Teaser" | "Clip" | ...
    key: string;         // YouTube id
    official?: boolean;
    iso_639_1?: string;  // "es" | "en" ...
    iso_3166_1?: string; // "MX" | "ES" | "US" ...
};

const BASE = (process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(/\/$/, "");
const KEY = process.env.TMDB_API_KEY!;
if (!KEY) throw new Error("TMDB_API_KEY no está definida");

async function fetchVideos(movieId: string, lang?: string): Promise<TmdbVideo[]> {
    const url = new URL(`${BASE}/movie/${movieId}/videos`);
    url.searchParams.set("api_key", KEY);
    if (lang) url.searchParams.set("language", lang);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`TMDB videos error: ${res.status}`);
    const data = await res.json();
    return (data?.results ?? []) as TmdbVideo[];
}

function uniqueByKey(videos: TmdbVideo[]): TmdbVideo[] {
    const map = new Map<string, TmdbVideo>();
    for (const v of videos) map.set(v.key, v);
    return [...map.values()];
}

function pickBest(videos: TmdbVideo[]): TmdbVideo | null {
    const yt = videos.filter((v) => v.site === "YouTube");
    return (
        yt.find((v) => v.type === "Trailer" && v.iso_639_1 === "es" && v.iso_3166_1 === "MX") ||
        yt.find((v) => v.type === "Trailer" && v.iso_639_1 === "es") ||
        yt.find((v) => v.type === "Trailer" && v.iso_639_1 === "en") ||
        yt.find((v) => v.type === "Teaser" && v.iso_639_1 === "es") ||
        yt.find((v) => v.type === "Teaser" && v.iso_639_1 === "en") ||
        yt.find((v) => v.type === "Clip" && v.iso_639_1 === "es") ||
        yt.find((v) => v.type === "Trailer") ||
        yt.find((v) => v.type === "Teaser" || v.type === "Clip") ||
        yt[0] ||
        null
    );
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Probar varios idiomas; no usamos helper para no forzar language fijo
        const langs: ReadonlyArray<string | undefined> = ["es-MX", "es-ES", "es", "en-US", "en", undefined];

        const settled = await Promise.allSettled(langs.map((l) => fetchVideos(id, l)));
        const all: TmdbVideo[] = [];
        for (const s of settled) {
            if (s.status === "fulfilled") all.push(...s.value);
        }

        const uniq = uniqueByKey(all);
        const best = pickBest(uniq);

        return NextResponse.json({
            site: best?.site ?? null,
            key: best?.key ?? null,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
