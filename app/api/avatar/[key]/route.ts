import { NextResponse } from "next/server";
import { archetypeByKey } from "@/lib/archetypes";
import { avatarPng } from "@/lib/avatars/store";
import { drawnAvatarSvg } from "@/lib/avatars/drawn";

/**
 * An archetype avatar, always as an image.
 *
 * The route answers with something renderable in every case — generated PNG
 * when there is one, our drawn emblem when there is not — so no component
 * anywhere has to handle a broken avatar. The only 404 is an archetype that
 * does not exist, and the key space is the sixteen-row table.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!archetypeByKey(key)) {
    return NextResponse.json({ error: "Unknown archetype" }, { status: 404 });
  }

  const png = await avatarPng(key);
  if (png) {
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        // Sixteen fixed images that never change once generated.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(drawnAvatarSvg(key), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      /*
       * Short, unlike the PNG above: this is the drawn stand-in, and the next
       * request may be the one that generates the real mark.
       */
      "cache-control": "public, max-age=300",
    },
  });
}
