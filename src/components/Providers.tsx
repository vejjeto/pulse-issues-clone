"use client";

import { CommandPalette } from "@/components/CommandPalette";
import { ToastProvider } from "@/components/ToastProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <CommandPalette />
      </ToastProvider>
    </QueryClientProvider>
  );
}
