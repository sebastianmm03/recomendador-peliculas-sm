// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recomendador de Películas",
  description: "Chat que interpreta tu intención y recomienda con TMDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="bg-zinc-950 text-zinc-100 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
