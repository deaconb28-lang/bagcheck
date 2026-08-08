// Icons from The Noun Project. names.ts is the vocabulary and is safe in a
// client bundle; noun.ts signs and sanitizes and is not; fetch.ts is the only
// caller of the API, and the secret never reaches the client. The vocabulary
// is a closed allowlist — /api/icon serves names, never search terms.
export { ICONS, iconSrc, iconsEnabled, isIconName } from "./names";
export type { IconName } from "./names";
export { sanitizeSvg } from "./noun";
export { BLANK_SVG, getIcon, storedIcons } from "./fetch";
export type { StoredIcon } from "./fetch";
