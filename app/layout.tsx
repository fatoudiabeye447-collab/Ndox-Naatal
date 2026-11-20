import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDox et Naatal — Agriculture intelligente",
  description: "Tableau de bord IoT agricole",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
