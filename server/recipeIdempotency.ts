export function hasRecipeIdempotencyKey(key: string | null | undefined): key is string {
  return typeof key === "string" && key.trim().length >= 8;
}

export function hasMatchingRecipeRequestHash(
  storedHash: string | null | undefined,
  requestHash: string,
): boolean {
  return typeof storedHash === "string" && storedHash.length > 0 && storedHash === requestHash;
}
