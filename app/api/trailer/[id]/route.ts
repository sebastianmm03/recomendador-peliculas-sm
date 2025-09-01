import { NextRequest, NextResponse } from "next/server";

type TmdbVideo = {
    site: string;       // "YouTube"
    type: string;       // "Trailer" | "Teaser" | "Clip" | ...
    key: string;        // YouTube id
    official?: boolean;
    iso_639_1?: string; // "es" | "en" ...
    iso_3166_1?: string; // "MX" | "ES" | "US" ...
};

const BASE = (process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(/\/$/, "");
const KEY = process.env.TMDB_API_KEY!;
if (!KEY) throw new Error("TMDB_API_KEY no está definida");

async function fetchVideos(movieId: string, lang?: string) {
    const url = new URL(`${BASE}/movie/${movieId}/videos`);
    url.searchParams.set("api_key", KEY);
    if (lang) url.searchParams.set("language", lang);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`TMDB videos error: ${res.status}`);
    const data = await res.json();
    return (data?.results ?? []) as TmdbVideo[];
}

function pickBest(videos: TmdbVideo | TmdbVideo[] | null | undefined): TmdbVideo | null {
    const vs = Array.isArray(videos) ? videos : [];
    // Solo YouTube
    const yt = vs.filter(v => v.site === "YouTube");
    // Preferencias en cascada
    return (
        // Trailer español MX
        yt.find(v => v.type === "Trailer" && v.iso_639_1 === "es" && v.iso_3166_1 === "MX") ||
        // Trailer español (cualquier región)
        yt.find(v => v.type === "Trailer" && v.iso_639_1 === "es") ||
        // Trailer inglés
        yt.find(v => v.type === "Trailer" && v.iso_639_1 === "en") ||
        // Teaser español
        yt.find(v => v.type === "Teaser" && v.iso_639_1 === "es") ||
        // Teaser inglés
        yt.find(v => v.type === "Teaser" && v.iso_639_1 === "en") ||
        // Clip español
        yt.find(v => v.type === "Clip" && v.iso_639_1 === "es") ||
        // Cualquier Trailer
        yt.find(v => v.type === "Trailer") ||
        // Cualquier Teaser/Clip
        yt.find(v => v.type === "Teaser" || v.type === "Clip") ||
        // Lo que haya
        yt[0] ||
        null
    );
}

export async function GET(
    _req: NextRequest,
    context:
        | { params: { id: string } }
        | { params: Promise<{ id: string }> }
) {
    try {
        const params = "params" in context ? await (context as any).params : (context as any).params;
        const id = params.id as string;

        // Intentamos varios idiomas; *no* usamos el helper tmdb() para no filtrar por language fijo
        const langs = ["es-MX", "es-ES", "es", "en-US", "en", undefined] as const;

        let all: TmdbVideo[] = [];
        for (const lang of langs) {
            try {
                const list = await fetchVideos(id, lang as any);
                all = all.concat(list);
            } catch {
                // ignoramos y seguimos con el siguiente idioma
            }
        }

        // Quitar duplicados por key de YouTube
        const uniq = Array.from(
            new Map(all.filter(Boolean).map(v => [v.key, v])).values()
        );

        const best = pickBest(uniq);

        return NextResponse.json({
            site: best?.site ?? null,
            key: best?.key ?? null,
        });
    } catch (e) {
        const err = e as Error;
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
