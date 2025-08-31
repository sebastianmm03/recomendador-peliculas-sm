import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/app/lib/tmdb";

type TmdbVideo = {
    site: string;
    type: string;
    key: string;
    official?: boolean;
    iso_639_1?: string;  // idioma
    iso_3166_1?: string; // país
};

// 👇 Nota: en Next 15, params llega como Promise<{ id: string }>
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ site: string | null; key: string | null } | { error: string }>> {
    try {
        const { id } = await context.params;

        // Intentamos primero en inglés; si no hay resultados, caemos a es-MX
        let data = await tmdb(`/movie/${id}/videos`, { language: "en-US" });
        if (!data.results?.length) {
            data = await tmdb(`/movie/${id}/videos`, { language: "es-MX" });
        }

        const results: TmdbVideo[] = data.results ?? [];

        // Busca el mejor tráiler de YouTube (inglés/latino si es posible)
        const trailer =
            results.find(
                (v) => v.site === "YouTube" && v.type === "Trailer" && (v.iso_639_1 === "en")
            ) ||
            results.find(
                (v) =>
                    v.site === "YouTube" &&
                    v.type === "Trailer" &&
                    (v.iso_639_1 === "es" || v.iso_3166_1 === "MX" || v.iso_3166_1 === "419")
            ) ||
            results.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
            null;

        return NextResponse.json({
            site: trailer?.site ?? null,
            key: trailer?.key ?? null,
        });
    } catch (e) {
        const err = e as Error;
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
