import { permanentRedirect } from "next/navigation";

/**
 * /cards folded into /you.
 *
 * Four screens asked one question — what does my own history say about me —
 * and answered it with the archetype on three of them, the components on two,
 * and a third of their tiles locked behind invented figures. Permanent: these
 * URLs are in bookmarks and in every link minted before the merge.
 */
/*
 * Per request, not at build time. Without this Next prerenders the stub, and
 * the (app) layout it renders inside evaluates `appLocked()` with whatever
 * the *build* environment had — so a locked build bakes `redirect("/")` into
 * the static output and every one of these URLs lands on the marketing page
 * forever, whatever the deployment is set to afterwards.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  permanentRedirect("/you");
}
