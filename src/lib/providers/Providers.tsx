"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditorAuthProvider } from "../auth/EditorAuthProvider";
import { ToastProvider } from "../ui/toast";

/**
 * Root client-side providers. Single QueryClient instance per request,
 * tucked behind useState so HMR doesn't re-instantiate it.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <EditorAuthProvider>{children}</EditorAuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
