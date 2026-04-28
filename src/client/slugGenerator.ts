import { customAlphabet, customRandom } from "nanoid";

const URL_SAFE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const LENGTH = 8;

export type RandomSource = (size: number) => Uint8Array;

export const SlugGenerator = {
  generate(random?: RandomSource): string {
    if (random) {
      const gen = customRandom(URL_SAFE_ALPHABET, LENGTH, random);
      return gen();
    }
    const gen = customAlphabet(URL_SAFE_ALPHABET, LENGTH);
    return gen();
  },
};
