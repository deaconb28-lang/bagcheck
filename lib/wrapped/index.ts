// Wrapped — the artwork behind a share card.
//
// Nothing here runs at request time. `scenes.ts` and `brief.ts` are pure, and
// they exist to author the **twelve fixed images** in `public/cards` via
// `npm run backdrops` — one per card kind, committed, worn by every user of
// that kind. What makes a card someone's own is composited over the art in
// type: their figure, their sentence, their company.
//
// That is the Wrapped model, and it is deliberate. Generating a private
// painting per person costs about thirty-five seconds and an image bill at
// every mint, and nobody else ever sees it.
export { SCENE, sceneFor } from "./scenes";
export { artPromptFor, briefKey, directionOf, textureOf, unit } from "./brief";
export type { ArtBrief, ArtShape } from "./brief";
