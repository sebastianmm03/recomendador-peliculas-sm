"use client";
import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({ mood: "", energy: "", time: "" });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("FORM:", form);
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl text-center font-bold mb-10 capitalize">
        Recomendador de Películas
      </h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          ¿Cómo se encuentra su estado de ánimo?
          <select
            value={form.mood}
            onChange={(e) => set("mood", e.target.value)}
            className="block w-full p-2 border rounded"
          >
            <option value="">Seleccione</option>
            <option value="ligero">Ligero</option>
            <option value="intenso">Intenso</option>
            <option value="romantico">Romántico</option>
            <option value="suspenso">Suspenso</option>
            <option value="terror">Terror</option>
            <option value="aventura">Aventura</option>
          </select>
        </label>

        <label className="block">
          ¿Cómo siente su energía el día de hoy?
          <select
            value={form.energy}
            onChange={(e) => set("energy", e.target.value)}
            className="block w-full p-2 border rounded"
          >
            <option value="">Seleccione</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <label className="block">
          ¿Cuánto tiempo disponible tiene para disfrutar de una excelente
          película?
          <select
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            className="block w-full p-2 border rounded"
          >
            <option value="">Seleccione</option>
            <option value="<90">Menos de 90 min</option>
            <option value="90-120">90 - 120 min</option>
            <option value=">120">Más de 120 min</option>
          </select>
        </label>

        <button
          type="submit"
          className="px-4 py-2 bg-gray-700 text-white rounded"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
