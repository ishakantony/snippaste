let clientId: string | null = null;

export function getClientId(): string {
  if (!clientId) {
    clientId = crypto.randomUUID();
  }
  return clientId;
}
