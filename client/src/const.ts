export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export async function loginWithPassword(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (response.ok) {
    return { ok: true };
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, error: body?.error ?? "Não foi possível entrar." };
}
