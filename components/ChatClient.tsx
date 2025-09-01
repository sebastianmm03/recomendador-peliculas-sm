"use client";
import React, { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

type Movie = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

type ApiReply = {
  ok: boolean;
  assistant?: string;
  results?: Movie[];
  error?: string;
};

type TrailerData = { site: string | null; key: string | null };

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola, ¿qué se te antoja ver hoy?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // resultados devueltos por /api/chat para listarlos en línea
  const [results, setResults] = useState<Movie[]>([]);

  // estado del tráiler
  const [openTrailerFor, setOpenTrailerFor] = useState<number | null>(null);
  const [trailers, setTrailers] = useState<Record<number, TrailerData>>({});
  const [loadingTrailerId, setLoadingTrailerId] = useState<number | null>(null);

  function yearOf(m: Movie) {
    return (m.release_date || m.first_air_date || "").slice(0, 4) || "s/f";
  }

  async function toggleTrailer(id: number) {
    if (openTrailerFor === id) {
      setOpenTrailerFor(null);
      return;
    }
    if (!trailers[id]) {
      try {
        setLoadingTrailerId(id);
        const res = await fetch(`/api/trailer/${id}`);
        const data = (await res.json()) as TrailerData;
        setTrailers((prev) => ({ ...prev, [id]: data }));
      } catch {
        setTrailers((prev) => ({ ...prev, [id]: { site: null, key: null } }));
      } finally {
        setLoadingTrailerId(null);
      }
    }
    setOpenTrailerFor(id);
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json: ApiReply = await res.json();

      if (json.ok) {
        setMessages([
          ...next,
          { role: "assistant", content: json.assistant || "Listo." },
        ]);
        setResults(Array.isArray(json.results) ? json.results : []);
      } else {
        setMessages([
          ...next,
          {
            role: "assistant",
            content: `Ups, hubo un error procesando tu mensaje.${
              json.error ? ` (${json.error})` : ""
            }`,
          },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Error de red o servidor." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // conservamos el orden que trae TMDB (ya lo decide tu backend con sort_by)
  const ordered = results?.slice(0, 12) ?? [];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Chat */}
      <div className="border border-zinc-700 rounded-2xl p-4 space-y-3 bg-transparent">
        <div className="h-64 md:h-72 overflow-y-auto space-y-2 pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-xl px-3 py-2 bg-gray-700 text-white shadow"
                  : "max-w-[85%] rounded-xl px-3 py-2 bg-zinc-800 text-zinc-100 shadow"
              }
            >
              {m.content}
            </div>
          ))}
          {loading && <div className="text-sm opacity-70">Pensando…</div>}
        </div>

        {/* input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? send() : undefined)}
            placeholder='p. ej., "ciencia ficción con robots, energía alta"'
            className="flex-1 border border-zinc-700 rounded-xl px-3 py-2 bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />
          <button
            onClick={send}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white transition"
            disabled={loading}
          >
            Enviar
          </button>
        </div>
      </div>

      {/* Lista en línea: título (año) + rating + botón Ver tráiler */}
      {ordered.length > 0 && (
        <div className="space-y-2">
          {ordered.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 border border-zinc-700 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {m.title || m.name || "Sin título"}{" "}
                  <span className="opacity-70">({yearOf(m)})</span>
                </div>
                <div className="text-sm opacity-80">
                  ⭐ {(m.vote_average ?? 0).toFixed(1)}
                </div>
              </div>
              <button
                onClick={() => toggleTrailer(m.id)}
                className="shrink-0 rounded-lg border border-zinc-600 px-3 py-2 text-sm hover:bg-zinc-800 transition"
              >
                Ver tráiler
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal tráiler */}
      {openTrailerFor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenTrailerFor(null)}
        >
          <div
            className="bg-black rounded-xl w-full max-w-3xl aspect-video overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingTrailerId === openTrailerFor ? (
              <div className="w-full h-full flex items-center justify-center text-zinc-200">
                Cargando tráiler…
              </div>
            ) : trailers[openTrailerFor!]?.site === "YouTube" &&
              trailers[openTrailerFor!]?.key ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${
                  trailers[openTrailerFor!].key
                }?autoplay=1`}
                title="Tráiler"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="no-referrer"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                No encontramos un tráiler disponible.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
