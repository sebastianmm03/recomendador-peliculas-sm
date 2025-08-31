"use client";
import { useState } from "react";
import Image from "next/image";

type Answers = {
  mood:
    | ""
    | "ligero"
    | "intenso"
    | "romantico"
    | "suspenso"
    | "terror"
    | "aventura";
  energy: "" | "baja" | "media" | "alta";
};

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

function truncate(s: string | null | undefined, n = 180) {
  if (!s) return "Sin descripción";
  const text = s.trim();
  return text.length > n ? text.slice(0, n).trim() + "…" : text;
}

export default function Home() {
  const [form, setForm] = useState<Answers>({ mood: "", energy: "" });
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [openTrailerFor, setOpenTrailerFor] = useState<number | null>(null);
  const [trailers, setTrailers] = useState<
    Record<number, { site: string | null; key: string | null }>
  >({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toggle = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const set = (k: keyof Answers, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [usedParams, setUsedParams] = useState<Record<
    string,
    string | number | boolean
  > | null>(null);
  const isComplete = form.mood && form.energy;

  async function toggleTrailer(movieId: number) {
    // si ya está abierta, ciérrala
    if (openTrailerFor === movieId) {
      setOpenTrailerFor(null);
      return;
    }
    // si no tenemos el trailer cacheado, lo pedimos
    if (!trailers[movieId]) {
      try {
        const res = await fetch(`/api/trailer/${movieId}`);
        const data = await res.json();
        setTrailers((prev) => ({ ...prev, [movieId]: data }));
      } catch {
        setTrailers((prev) => ({
          ...prev,
          [movieId]: { site: null, key: null },
        }));
      }
    }
    setOpenTrailerFor(movieId);
  }

  async function fetchPage(p: number, currentForm = form) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentForm, page: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al recomendar");

      setMovies(data.results);
      setUsedParams(data.params);
      setPage(data.page ?? p);
      setTotalPages(data.total_pages ?? 1);
    } catch (err) {
      setError((err as Error).message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    await fetchPage(1, form);
  };

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-10 text-center buttoncapitalize">
        Recomendador de Películas
      </h1>

      {/* FORMULARIO */}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          ¿Cómo seria su estado de ánimo si fuera una película?
          <select
            value={form.mood}
            onChange={(e) => set("mood", e.target.value)}
            className="block w-full p-2 border rounded mt-1"
          >
            <option className="bg-gray-700 text-white" value="">
              Selecciona
            </option>
            <option className="bg-gray-700 text-white" value="ligero">
              Ligero
            </option>
            <option className="bg-gray-700 text-white" value="intenso">
              Intenso
            </option>
            <option className="bg-gray-700 text-white" value="romantico">
              Romántico
            </option>
            <option className="bg-gray-700 text-white" value="suspenso">
              Suspenso
            </option>
            <option className="bg-gray-700 text-white" value="terror">
              Terror
            </option>
            <option className="bg-gray-700 text-white" value="aventura">
              Aventura
            </option>
          </select>
        </label>

        <label className="block">
          ¿Qué tal se siente enérgicamente hoy?
          <select
            value={form.energy}
            onChange={(e) => set("energy", e.target.value)}
            className="block w-full p-2 border rounded mt-1"
          >
            <option className="bg-gray-700 text-white" value="">
              Selecciona
            </option>
            <option className="bg-gray-700 text-white" value="baja">
              Baja
            </option>
            <option className="bg-gray-700 text-white" value="media">
              Media
            </option>
            <option className="bg-gray-700 text-white" value="alta">
              Alta
            </option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || !isComplete}
          className="px-4 py-2 bg-gray-700 text-white rounded transition hover:bg-gray-600 hover:shadow-lg"
          aria-busy={loading}
        >
          {loading ? "Buscando…" : "Enviar"}
        </button>
      </form>

      {/* Los estados */}
      {loading && <p className="mt-4">Buscando…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {/* Visualizar las tarjetas */}
      <section className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {movies.map((m) => (
          <article
            key={m.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition hover:shadow-md hover:border-zinc-600"
          >
            {/* Imagen con proporción 2:3 */}
            <div className="relative w-full" style={{ aspectRatio: "2 / 3" }}>
              <Image
                src={
                  m.poster_path
                    ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                    : "https://via.placeholder.com/342x513?text=Sin+poster"
                }
                alt={m.title}
                fill
                className="w-full h-full object-cover"
                sizes="(min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw"
              />
            </div>

            {/* Contenido */}
            <div className="p-3 flex flex-col gap-2 grow">
              <h3 className="font-semibold leading-snug">{m.title}</h3>
              <div className="text-sm opacity-70">
                ⭐ {m.vote_average.toFixed(1)}
              </div>

              <p className="text-sm opacity-90">
                {expanded[m.id]
                  ? m.overview || "Sin descripción"
                  : truncate(m.overview, 180)}
              </p>

              {m.overview && m.overview.length > 180 && (
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="text-xs mt-1 underline opacity-80 hover:opacity-100 self-start"
                >
                  {expanded[m.id] ? "Ver menos" : "Ver más"}
                </button>
              )}

              {/* Ver trailer */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => toggleTrailer(m.id)}
                  className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-blue-500 transition self-start"
                >
                  {openTrailerFor === m.id ? "Cerrar tráiler" : "Ver tráiler"}
                </button>

                {openTrailerFor === m.id && (
                  <div className="mt-2 rounded overflow-hidden border border-zinc-800">
                    {(() => {
                      const t = trailers[m.id];
                      if (!t) {
                        return (
                          <div className="p-3 text-sm opacity-80">
                            Cargando tráiler…
                          </div>
                        );
                      }
                      if (t.site === "YouTube" && t.key) {
                        return (
                          <div
                            className="relative w-full"
                            style={{ aspectRatio: "16 / 9" }}
                          >
                            <iframe
                              className="absolute inset-0 w-full h-full"
                              src={`https://www.youtube.com/embed/${t.key}?autoplay=1`}
                              title={`Tráiler de ${m.title}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 text-sm opacity-80">
                          No encontramos un tráiler disponible.
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Paginas */}
      {!loading && movies.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fetchPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border border-zinc-700 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-sm opacity-80">
            Página {page} de {Math.min(totalPages, 500)}
          </span>
          <button
            type="button"
            onClick={() => fetchPage(page + 1)}
            disabled={page >= Math.min(totalPages, 500)}
            className="px-3 py-1 rounded border border-zinc-700 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Mensaje vacío cuando se termina de cargar */}
      {!loading && usedParams && movies.length === 0 && (
        <p className="mt-4 opacity-70">Sin resultados con esos criterios.</p>
      )}
    </main>
  );
}
