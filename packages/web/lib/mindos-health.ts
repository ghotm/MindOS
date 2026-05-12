export function isMindosHealthPayload(value: unknown): value is { ok: true; service: 'mindos' } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { ok?: unknown }).ok === true &&
    (value as { service?: unknown }).service === 'mindos',
  );
}

export async function fetchMindosHealth(url: string, init?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return false;
    return isMindosHealthPayload(await res.json().catch(() => null));
  } catch {
    return false;
  }
}
