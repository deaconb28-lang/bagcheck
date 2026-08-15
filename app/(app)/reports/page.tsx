import { permanentRedirect } from "next/navigation";

/**
 * /reports became /wrapped in the v2 shell. Permanent rather than temporary:
 * these are the URLs in every bookmark and every link minted before the
 * rename, and they are not coming back.
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
  permanentRedirect("/wrapped");
}
