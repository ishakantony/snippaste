let cachedId: string | null = null;

export function getClientId(): string {
  if (!cachedId) {
    cachedId = crypto.randomUUID();
  }
  return cachedId;
}
