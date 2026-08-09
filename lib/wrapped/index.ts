// Wrapped — the generated half of a share card.
//
// brief.ts and scenes.ts are pure: they turn one person's measured numbers
// into the picture their card asks for. generate.ts is the only caller of
// OpenAI, and it is only ever reached at mint time.
export { SCENE, sceneFor } from "./scenes";
export { artPromptFor, briefKey, directionOf, textureOf, unit } from "./brief";
export type { ArtBrief, ArtShape } from "./brief";
export { briefFor, generateCardArt, isImageGenConfigured } from "./generate";
export type { GeneratedArt } from "./generate";
