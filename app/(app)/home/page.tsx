import { permanentRedirect } from "next/navigation";

/**
 * Home is the dashboard, and the dashboard is `/you`.
 *
 * The two screens were one question with two halves: `/home` answered "how is
 * it going" and `/you` answered "what does my history say about me". The money
 * lived on one and everything explaining the money lived on the other, joined
 * by a quiet link most readers never followed. They are one page now.
 *
 * `force-dynamic` is load-bearing on every stub in this group: statically
 * prerendered, they bake the locked layout's `redirect("/")` in at build time
 * and answer with the marketing page forever after.
 */
export const dynamic = "force-dynamic";

export default function HomeRedirect(): never {
  permanentRedirect("/you");
}
