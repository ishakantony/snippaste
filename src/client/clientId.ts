import { customRandom, customAlphabet } from "nanoid";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const LENGTH = 12;

export type RandomSource = (size: number) => Uint8Array;

/** Generate a fresh per-tab client identifier. Not persisted — each tab gets its own. */
export function createClientId(random?: RandomSource): string {
  if (random) return customRandom(ALPHABET, LENGTH, random)();
  return customAlphabet(ALPHABET, LENGTH)();
}

let cached: string | null = null;

/** Per-module-instance cached client id. Lazily initialised on first call. */
export function getClientId(): string {
  if (cached === null) cached = createClientId();
  return cached;
}
