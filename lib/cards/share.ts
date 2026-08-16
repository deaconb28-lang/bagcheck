/**
 * Where a card can go, and how it actually gets there.
 *
 * Pure — this decides the targets and builds the URLs; the sheet renders
 * whatever it returns.
 *
 * **The three platforms are not the same shape, and pretending they are is
 * how you ship a button that does nothing.**
 *
 * - **X** has a real web intent. `x.com/intent/post?url=…` opens the composer
 *   with the link already in it, and X unfurls the OpenGraph card. One tap,
 *   nothing to save.
 * - **Instagram has no web compose endpoint.** There is no URL that opens a
 *   feed post or a story with an image attached — Meta removed that years ago
 *   and never replaced it for the web. Instagram also strips links out of
 *   captions, so a link-based intent would be pointless even if one existed.
 * - **TikTok is the same**, and video-first besides. Its only upload surface
 *   is the app and a business API neither of which a share button can reach.
 *
 * So those two go through the **Web Share API with the image file attached**,
 * which hands the real picture to the OS sheet — where Instagram and TikTok
 * are, alongside everything else installed. Where that API is unavailable
 * (every desktop browser today), the honest fallback is to download the image
 * at the right size and say so.
 *
 * The rule this file exists to keep: **a target is only offered when it will
 * work.** `shareTargets` takes the browser's actual capabilities and returns
 * fewer targets on a browser that can do less, rather than returning buttons
 * that fail on tap.
 */

/** 1080×1350. The Instagram feed crops anything taller. */
export const FEED = { w: 1080, h: 1350 } as const;
/** 1080×1920. Stories, Reels and TikTok all want 9:16. */
export const STORY = { w: 1080, h: 1920 } as const;
/** 1200×630. What a link unfurls as. */
export const UNFURL = { w: 1200, h: 630 } as const;

export type ShareFormat = "feed" | "story" | "unfurl";

export const FORMAT_SIZE: Record<ShareFormat, { w: number; h: number }> = {
  feed: FEED,
  story: STORY,
  unfurl: UNFURL,
};

export type ShareTargetId = "x" | "instagram" | "tiktok" | "copy" | "download";

export type ShareAction =
  /** Open a URL — a real compose intent on the platform's own site. */
  | { kind: "open"; href: string }
  /** Hand the image file to the OS share sheet. */
  | { kind: "native"; format: ShareFormat }
  /** Save the image so it can be attached by hand. */
  | { kind: "download"; format: ShareFormat }
  | { kind: "copy" };

export interface ShareTarget {
  id: ShareTargetId;
  label: string;
  /** One line under the label, saying what the tap will actually do. */
  note: string;
  action: ShareAction;
}

export interface ShareCapabilities {
  /** `navigator.canShare({ files })` — the only route to Instagram or TikTok. */
  canShareFiles: boolean;
  /** `navigator.share` without files. Enough for a link, not for a picture. */
  canShareLink: boolean;
}

/**
 * The X composer, with the card's link.
 *
 * `x.com`, not `twitter.com`: the old host still redirects, but a redirect on
 * a share intent is a chance for a mobile app handler to miss it.
 */
export function xIntent(url: string, text: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://x.com/intent/post?${params.toString()}`;
}

/** The image, at the size the destination actually wants. */
export function imageUrl(slug: string, format: ShareFormat): string {
  const query = format === "unfurl" ? "" : `?format=${format}`;
  return `/og/${encodeURIComponent(slug)}${query}`;
}

/** The filename a download lands under. Readable in a camera roll. */
export function downloadName(kind: string, format: ShareFormat): string {
  return `bagcheck-${kind}-${format}.png`;
}

/**
 * The targets to offer, in order, for these capabilities.
 *
 * Instagram and TikTok are omitted entirely — not disabled — when the browser
 * cannot share a file and the caller is not on a device where saving to a
 * camera roll makes sense. A locked affordance a user then discovers is
 * useless is worse than no affordance.
 */
export function shareTargets(
  url: string,
  text: string,
  caps: ShareCapabilities,
): ShareTarget[] {
  const targets: ShareTarget[] = [
    {
      id: "x",
      label: "X",
      note: "Opens the composer with your link. It unfurls as the card.",
      action: { kind: "open", href: xIntent(url, text) },
    },
  ];

  /*
   * Instagram and TikTok can only be reached through the OS sheet, and only
   * with the file attached — neither accepts a link. On a browser that cannot
   * do that, the picture still has to get to the phone somehow, so the target
   * becomes an honest download rather than disappearing.
   */
  const instagram: ShareTarget = caps.canShareFiles
    ? {
        id: "instagram",
        label: "Instagram",
        note: "Sends the image to your share sheet. Pick Instagram there.",
        action: { kind: "native", format: "feed" },
      }
    : {
        id: "instagram",
        label: "Instagram",
        note: "Saves the image at 1080×1350. Instagram has no web composer.",
        action: { kind: "download", format: "feed" },
      };

  const tiktok: ShareTarget = caps.canShareFiles
    ? {
        id: "tiktok",
        label: "TikTok",
        note: "Sends the image to your share sheet. Pick TikTok there.",
        action: { kind: "native", format: "story" },
      }
    : {
        id: "tiktok",
        label: "TikTok",
        note: "Saves the image at 1080×1920. TikTok has no web composer.",
        action: { kind: "download", format: "story" },
      };

  targets.push(instagram, tiktok);

  targets.push({
    id: "copy",
    label: "Copy link",
    note: "The card lives at its own URL. Paste it anywhere.",
    action: { kind: "copy" },
  });

  return targets;
}

/**
 * The line that goes with the link on X.
 *
 * Descriptive, and it never says what the reader should do about it. Ends
 * without a period because the URL follows it.
 */
export function shareText(headline: string, lede: string): string {
  const trimmed = lede.replace(/\.$/, "");
  return `${headline} — ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}
