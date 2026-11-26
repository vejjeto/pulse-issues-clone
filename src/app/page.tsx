"use client";

import { HealthBadge } from "@/components/HealthBadge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocale } from "@/lib/i18n";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Keyboard,
  Layers,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 dark:bg-[#0b0c10]">
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0d0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white shadow-sm">
              PI
            </span>
            <span>PulseIssues</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <HealthBadge />
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <span>{t.landing.ctaEnter}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:py-16">
        <section className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.landing.badge}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            {t.landing.heroTitlePrefix}{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {t.landing.heroTitleHighlight}
            </span>{" "}
            {t.landing.heroTitleSuffix}
          </h1>

          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            {t.landing.heroSubtitleBefore}{" "}
            <code className="font-mono text-sm">CHANGELOG.md</code>{" "}
            {t.landing.heroSubtitleAfter}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <span>{t.landing.ctaEnter}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/workspace?status=Done"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <CheckCircle2
                className="h-4 w-4 text-emerald-500"
                aria-hidden="true"
              />
              <span>{t.landing.ctaDone}</span>
            </Link>
          </div>
        </section>

        <section
          aria-label="Capacidades principales"
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a] p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Timer className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.landing.card1Title}
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.landing.card1Desc}
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <Clock
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
              <span>POST /api/issues/[id]/focus</span>
            </div>
          </article>

          <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a] p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.landing.card2Title}
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Agrupa issues <code className="font-mono text-xs">Done</code> por
              rango de fechas en Features, Bug Fixes e Improvements con suma
              total de Focus y descarga directa de{" "}
              <code className="font-mono text-xs">CHANGELOG.md</code>.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <Layers
                className="h-3.5 w-3.5 text-violet-500"
                aria-hidden="true"
              />
              <span>GET /api/changelog?from=...&amp;to=...</span>
            </div>
          </article>

          <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a] p-5 space-y-2.5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Keyboard className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.landing.card3Title}
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Navega con{" "}
              <kbd className="rounded border px-1 font-mono text-xs">J</kbd>/
              <kbd className="rounded border px-1 font-mono text-xs">K</kbd>,
              abre con{" "}
              <kbd className="rounded border px-1 font-mono text-xs">Enter</kbd>
              , crea con{" "}
              <kbd className="rounded border px-1 font-mono text-xs">C</kbd> y
              busca con{" "}
              <kbd className="rounded border px-1 font-mono text-xs">/</kbd>.
              Cada filtro sobrevive al refresh.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span>{t.landing.card3Footer}</span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
