// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { tmdb } from "@/app/lib/tmdb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const USE_FALLBACK = process.env.MOCK_INTENT === "1" || !process.env.OPENAI_API_KEY;

// ====== TIPOS DE INTENCIÓN ======
type Answers = {
    // tono/estado de ánimo (categorías amigables)
    mood: "" | "ligero" | "intenso" | "romantico" | "suspenso" | "terror" | "aventura";
    // ritmo deseado
    energy: "" | "baja" | "media" | "alta";
    // periodo preferido
    recency?: "" | "reciente" | "clasico";
    // idioma preferido (código corto)
    language?: "" | "es" | "en";
    // géneros a incluir/excluir (si el usuario los menciona explícitamente)
    include_genres?: string[]; // ej: ["ciencia ficcion","fantasia"]
    exclude_genres?: string[];
};

type DiscoverParams = Record<string, string | number | boolean>;

// ====== MAPEO DE GENEROS A TMDB ======
const GENRES_MAP: Record<string, string> = {
    "accion": "28",
    "acción": "28",
    "adventure": "12",
    "aventura": "12",
    "animation": "16",
    "animacion": "16",
    "animación": "16",
    "comedia": "35",
    "crime": "80",
    "crimen": "80",
    "documental": "99",
    "drama": "18",
    "family": "10751",
    "familiar": "10751",
    "fantasia": "14",
    "fantasía": "14",
    "historia": "36",
    "terror": "27",
    "misterio": "9648",
    "romance": "10749",
    "romantico": "10749",
    "romántico": "10749",
    "ciencia ficcion": "878",
    "ciencia ficción": "878",
    "suspenso": "53",
    "thriller": "53",
    "guerra": "10752",
    "western": "37",
};

// ====== MAPEADOR A /discover/movie ======
function answersToParams(a: Answers): DiscoverParams {
    const p: DiscoverParams = {
        sort_by: "popularity.desc",
        include_adult: false,
        "vote_count.gte": 200,
    };

    // mood → género/nota
    switch (a.mood) {
        case "ligero": p.with_genres = "35"; break;         // comedia
        case "romantico": p.with_genres = "10749"; break;   // romance
        case "terror": p.with_genres = "27"; break;         // horror
        case "suspenso": p.with_genres = "53"; break;       // suspense
        case "aventura": p.with_genres = "12,28"; break;    // aventura+acción
        case "intenso": p["vote_average.gte"] = 7; break;   // pide más calidad
    }

    // energy → orden y umbral
    if (a.energy === "alta") {
        p.sort_by = "vote_average.desc";
        const min = Number(p["vote_average.gte"] ?? 0);
        p["vote_average.gte"] = Math.max(min, 7.3);
    } else if (a.energy === "baja") {
        p.sort_by = "popularity.desc";
    }

    // recency → rango de fechas
    const now = new Date();
    if (a.recency === "reciente") {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 5); // últimos ~5 años
        p["primary_release_date.gte"] = d.toISOString().slice(0, 10);
    } else if (a.recency === "clasico") {
        p["primary_release_date.lte"] = "2000-01-01";
    }

    // language → original
    if (a.language === "es") p.with_original_language = "es";
    if (a.language === "en") p.with_original_language = "en";

    // include/exclude genres explícitos
    const inc = (a.include_genres ?? [])
        .map((g) => GENRES_MAP[g.toLowerCase()] ?? "")
        .filter(Boolean);
    const exc = (a.exclude_genres ?? [])
        .map((g) => GENRES_MAP[g.toLowerCase()] ?? "")
        .filter(Boolean);

    if (inc.length) {
        p.with_genres = p.with_genres ? `${p.with_genres},${inc.join(",")}` : inc.join(",");
    }
    if (exc.length) p.without_genres = exc.join(",");

    return p;
}

// ====== FALLBACK LOCAL ======
function localIntent(prompt: string): Answers {
    const p = prompt.toLowerCase();
    const a: Answers = { mood: "", energy: "" };

    if (/(comedia|ligera|reír|risa|livian)/.test(p)) a.mood = "ligero";
    else if (/(romántic|amor|romance)/.test(p)) a.mood = "romantico";
    else if (/(terror|miedo|horror)/.test(p)) a.mood = "terror";
    else if (/(suspenso|thriller|intriga)/.test(p)) a.mood = "suspenso";
    else if (/(aventura|acción|accion|épica)/.test(p)) a.mood = "aventura";
    else if (/(intens[oa]|fuerte|impactante|dram[aá])/.test(p)) a.mood = "intenso";

    if (/(baja|tranqui|tranquila|suave|lenta)/.test(p)) a.energy = "baja";
    else if (/(media|normal)/.test(p)) a.energy = "media";
    else if (/(alta|rápid[ao]|movida|dinámica|tensa)/.test(p)) a.energy = "alta";

    if (/(recient|nueva|últimos|ultimos)/.test(p)) a.recency = "reciente";
    if (/(clásic|clasico|antiguas|viejas|ochentas|noventas)/.test(p)) a.recency = "clasico";
    if (/(en español|español|latino)/.test(p)) a.language = "es";
    if (/(en inglés|ingles|subtítulos en inglés)/.test(p)) a.language = "en";

    // géneros explícitos
    const maybe = Object.keys(GENRES_MAP);
    a.include_genres = maybe.filter((g) => p.includes(g)); // simple match
    return a;
}

// ====== EXTRACTOR CON OPENAI (JSON ESTRICTO) ======
async function extractAnswersFromText(prompt: string): Promise<Answers> {
    if (USE_FALLBACK) return localIntent(prompt);

    const system = `
Eres un extractor estricto para un recomendador de películas.
Devuelve SOLO un JSON con estas claves:
{
  "mood": "",             // "", "ligero","intenso","romantico","suspenso","terror","aventura"
  "energy": "",           // "", "baja","media","alta"
  "recency": "",          // "", "reciente","clasico"
  "language": "",         // "", "es","en"
  "include_genres": [],   // array de strings
  "exclude_genres": []    // array de strings
}
Sin comentarios ni texto extra.
`.trim();

    try {
        const out = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt },
            ],
        });

        const raw = out.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const ans: Answers = {
            mood: (parsed.mood ?? "") as Answers["mood"],
            energy: (parsed.energy ?? "") as Answers["energy"],
            recency: (parsed.recency ?? "") as Answers["recency"],
            language: (parsed.language ?? "") as Answers["language"],
            include_genres: Array.isArray(parsed.include_genres) ? parsed.include_genres : [],
            exclude_genres: Array.isArray(parsed.exclude_genres) ? parsed.exclude_genres : [],
        };
        return ans;
    } catch (e: unknown) {
        const status =
            typeof e === "object" && e !== null && "status" in e
                ? (e as { status?: number }).status
                : undefined;
        const message = e instanceof Error ? e.message : String(e);
        console.error("OpenAI error:", status, message);
        return localIntent(prompt);
    }
} // ← IMPORTANTE: cerrar la función AQUÍ

export async function POST(req: NextRequest) {
    try {
        const { message, page = 1 } = (await req.json()) as { message: string; page?: number };

        const answers = await extractAnswersFromText(message);
        const params = answersToParams(answers);
        const safePage = Math.max(1, Math.min(Number(page || 1), 500));

        type Movie = {
            id: number;
            title?: string;
            name?: string;
            release_date?: string;
            first_air_date?: string;
            poster_path?: string | null;
            vote_average?: number;
            overview?: string;
        };

        const data = await tmdb("/discover/movie", { ...params, page: safePage });

        const pretty = (data.results as Movie[]).slice(0, 5).map((m) => {
            const title = m.title || m.name || "Sin título";
            const year = (m.release_date || m.first_air_date || "").slice(0, 4) || "s/f";
            return `• ${title} (${year})`;
        }).join(" • ");

        const assistant = pretty.length
            ? `Según lo que pides, podrían gustarte: ${pretty}. ¿Quieres afinar (p. ej., “más románticas recientes, energía baja”)?`
            : `No encontré coincidencias claras. ¿Quieres probar con otra descripción (género, época, ritmo)?`;

        return NextResponse.json({
            ok: true,
            answers,
            params,
            page: data.page,
            total_pages: data.total_pages,
            results: data.results,
            assistant,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
