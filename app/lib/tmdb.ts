const KEY = process.env.TMDB_API_KEY;

if (!KEY) {
  throw new Error("TMDB_API_KEY no está definida. Crea .env.local con TMDB_API_KEY.");
}

export async function tmdb(
  path: string,
  params: Record<string, string | number | boolean> = {}
) {
  const base = (process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(/\/$/, "");
  const pathClean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${pathClean}`);

  const KEY = process.env.TMDB_API_KEY;
  const LOCALE = process.env.APP_LOCALE || "es-MX";
  const REGION = process.env.APP_REGION || "CO";

  if (!KEY) {
    throw new Error("TMDB_API_KEY no está definida. Crea .env.local con TMDB_API_KEY.");
  }

  url.searchParams.set("api_key", KEY);
  url.searchParams.set("language", LOCALE);
  url.searchParams.set("region", REGION);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  // TEMP: si necesitas depurar, descomenta:
  // console.log("TMDB URL =>", url.toString());

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}