import { permanentRedirect } from "next/navigation";

/**
 * /activity became /ledger in the v2 shell. Permanent rather than temporary:
 * these are the URLs in every bookmark and every link minted before the
 * rename, and they are not coming back.
 */
export default function Page() {
  permanentRedirect("/ledger");
}
