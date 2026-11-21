import { head, put } from "@vercel/blob";

function normalizeKey(relKey: string) {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN não está configurado");
  return token;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const pathname = appendHashSuffix(normalizeKey(relKey));
  const body = data instanceof Uint8Array && !Buffer.isBuffer(data) ? Buffer.from(data) : data;
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    token: blobToken(),
  });
  return { key: blob.pathname, url: blob.url };
}

export async function storagePutPublic(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  return storagePut(relKey, data, contentType);
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 3600) {
  void expiresIn;
  const blob = await head(normalizeKey(relKey), { token: blobToken() });
  return blob.url;
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: await storageGetSignedUrl(key) };
}
