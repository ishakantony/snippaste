// Per-tab UUID — not persisted, so each tab gets its own ID
let cachedId: string | null = null;

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getClientId(): string {
  if (!cachedId) {
    cachedId = generateId();
  }
  return cachedId;
}
