# Recomendador de Películas (Next.js + TMDB)

Pequeña app que hace unas preguntas rápidas y sugiere películas usando la API de TMDB.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- TMDB API (server-side)

## Configuración

1. Clonar el repo
2. `cp .env.local.example .env.local` y rellenar:
   - `TMDB_API_KEY=...`
   - `TMDB_BASE_URL=https://api.themoviedb.org/3`
   - `APP_LOCALE=es-ES`
   - `APP_REGION=CO`
3. `npm install`
4. `npm run dev` y abrir http://localhost:3000

## Cómo funciona

- El **frontend** envía `{ mood, energy, page }` a `/api/recommend`.
- El **backend** traduce las respuestas a parámetros de `/discover/movie` y añade paginación.
- Se muestran tarjetas con póster, título, ⭐ y un resumen (con “Ver más/menos”).
- Cada tarjeta permite abrir el **tráiler** (YouTube) inline.

## Decisiones

- La API key se usa en el **servidor** (no se expone al cliente).
- Paginación con botones Siguiente/Anterior (máx 500 páginas de TMDB).
- Se evita filtrar por duración porque los metadatos de runtime son irregulares.

## Mejoras futuras

- Guardar “favoritos” en localStorage.
- Filtros por año o proveedor de streaming.
- Tests básicos de endpoints.

## Prompting usado (reglas de negocio)

- “Eres un asistente de recomendación de películas…”
- Si el usuario está **ligero** → prioriza **Comedia (35)**.
- **Romántico** → **Romance (10749)**.
- **Intenso** → exige `vote_average.gte ≥ 7`.
- Energía **alta** → ordena por `vote_average.desc` y sube `vote_average.gte` a ≥ 7.3.
- Energía **baja** → ordena por `popularity.desc`.
- Sin contenido adulto y `vote_count.gte ≥ 200`.
