import { nanoid } from "nanoid";

let _id: string | null = null;

/** Returns a per-tab UUID. Generated once per module load; not persisted. */
export function getClientId(): string {
  if (!_id) _id = nanoid();
  return _id;
}
