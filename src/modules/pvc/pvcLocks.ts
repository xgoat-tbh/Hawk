const ownerOperations = new Map<string, Promise<void>>();

export async function withPvcOwnerLock<T>(guildId: string, ownerId: string, operation: () => Promise<T>): Promise<T> {
  const key = `${guildId}:${ownerId}`;
  const previous = ownerOperations.get(key);
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  ownerOperations.set(key, current);
  await previous;
  try { return await operation(); }
  finally {
    release();
    if (ownerOperations.get(key) === current) ownerOperations.delete(key);
  }
}
