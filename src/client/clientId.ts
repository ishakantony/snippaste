let cachedClientId: string | null = null;

export function getClientId(): string {
  if (cachedClientId === null) {
    cachedClientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return cachedClientId;
}
