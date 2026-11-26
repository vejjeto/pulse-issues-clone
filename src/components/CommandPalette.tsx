"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Command, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  href: string;
  external?: boolean;
}

const ACTIONS: PaletteAction[] = [
  {
    id: "workspace",
    label: "Ir al Workspace de Triaje",
    hint: "/workspace",
    href: "/workspace",
  },
  {
    id: "demo",
    label: "Abrir Demo directa",
    hint: "/demo",
    href: "/demo",
  },
  {
    id: "done",
    label: "Ver issues completados",
    hint: "/workspace?status=Done",
    href: "/workspace?status=Done",
  },
  {
    id: "home",
    label: "Página principal",
    hint: "/",
    href: "/",
  },
  {
    id: "docs",
    label: "Documentación API (Scalar)",
    hint: "/api/docs",
    href: "/api/docs",
    external: true,
  },
  {
    id: "openapi",
    label: "Especificación OpenAPI 3.1.0",
    hint: "/api/openapi.json",
    href: "/api/openapi.json",
    external: true,
  },
  {
    id: "health",
    label: "Estado de salud del servicio",
    hint: "/api/health",
    href: "/api/health",
    external: true,
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter(
      (action) =>
        action.label.toLowerCase().includes(q) ||
        action.hint.toLowerCase().includes(q),
    );
  }, [query]);

  function handleSelect(action: PaletteAction) {
    setOpen(false);
    setQuery("");
    if (action.external) {
      window.open(action.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(action.href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a] shadow-2xl outline-none">
          <Dialog.Title className="sr-only">
            Paleta de comandos de PulseIssues
          </Dialog.Title>
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ir a vista, API docs o endpoint..."
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            />
            <kbd className="inline-flex items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              <Command className="h-2.5 w-2.5" aria-hidden="true" />K
            </kbd>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-zinc-500">
                Sin comandos coincidentes.
              </li>
            ) : (
              filtered.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(action)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <span>{action.label}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500">
                      {action.hint}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
