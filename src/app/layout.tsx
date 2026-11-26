import { Providers } from "@/components/Providers";
import { PORTFOLIO_DISCLAIMER } from "@/lib/constants";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseIssues · Linear-inspired Issue Tracker & Focus Mode",
  description:
    "Issue tracker de ingeniería con atajos de teclado, sesiones Focus Pomodoro y generador automático de Release Notes en Markdown.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("pulse-theme") || localStorage.getItem("theme");
    var isDark = stored !== "light";
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static zero-FOUC theme init script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <div className="flex-1 flex flex-col">{children}</div>
          <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-[#0d0f14]/90 px-4 py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {PORTFOLIO_DISCLAIMER}
          </footer>
        </Providers>
      </body>
    </html>
  );
}
