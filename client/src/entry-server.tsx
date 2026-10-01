/**
 * Entrada SSR/SSG — usada apenas por scripts/prerender.ts no build.
 */

import App from "./App";
import { renderToString } from "react-dom/server";
import { trpc } from "./lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { Router } from "wouter";
export function render(url: string): string {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  const minimalTrpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "http://localhost/__ssr_noop__",
        transformer: superjson,
      }),
    ],
  });

  return renderToString(
    <Router ssrPath={url}>
      <trpc.Provider client={minimalTrpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </Router>
  );
}
