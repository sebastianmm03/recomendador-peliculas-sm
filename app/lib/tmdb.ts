//Se lee las variables de entorno definidas en .env.local
const BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;
const LOCALE = process.env.APP_LOCALE || "es-ES";
const REGION = process.env.APP_REGION || "CO";

if (!KEY) {
  throw new Error("TMDB_API_KEY no está definida. Crea .env.local con TMDB_API_KEY.");
}

/**
 * Se llama a la API de TMDB.
 * @param path Ruta de TMDB, ej: "/discover/movie", "/trending/movie/day"
 * @param params Parámetros de búsqueda/filtros, ej: { sort_by: "popularity.desc" }
 */

type TMDBParams = Record<string, string | number | boolean>;

export async function tmdb(path: string, params: TMDBParams = {}) {
  //Se construye la URL con el path
  const url = new URL(`${BASE}${path}`);

  //Se une la api, el idioma, la region y los params que se manden
  const search = { api_key: KEY, language: LOCALE, region: REGION, ...params };

  //Se mete cada parametro en el query si tiene valor
  Object.entries(search).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  })

  //Se hace la peticion de "no-store" para ver cambios inmediatos en dev
  const res = await fetch(url.toString(), { cache: "no-store" })

  //Si TMDB responde con un error, se lanza un error claro como excepción
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }

  //Aqui se devuelve el json listo
  return res.json();
}
