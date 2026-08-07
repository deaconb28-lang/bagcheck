"use client";

import { useEffect } from "react";

/**
 * Holds a route group in its mode. The inline script in the marketing
 * layout prevents a flash on direct loads; this re-asserts the mode on
 * client-side navigation between groups, which the script alone misses.
 */
export function ModeScope({ mode }: { mode: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  return null;
}
