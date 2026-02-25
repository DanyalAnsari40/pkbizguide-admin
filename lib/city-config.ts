export function getCityApiConfig() {
  const base = process.env.CITY_API_BASE?.trim()
  const key = process.env.CITY_API_KEY?.trim()
  const provincesPath = process.env.CITY_API_PROVINCES_PATH?.trim() || "/provinces"
  const citiesPath = process.env.CITY_API_CITIES_PATH?.trim() || "/cities"
  return { base, key, provincesPath, citiesPath }
}

export function requireBaseUrl() {
  const { base } = getCityApiConfig()
  if (!base) {
    throw new Error("CITY_API_BASE is not set in environment. Please add it to .env.local")
  }
  return base
}

export async function cityApiFetch(path: string, params?: Record<string, string | undefined>) {
  const { base, key } = getCityApiConfig()
  if (!base) {
    throw new Error("CITY_API_BASE is not set in environment. Please add it to .env.local")
  }
  const url = new URL(path, base.endsWith("/") ? base : base + "/")
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Upstream error ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

// Helpers to coerce arbitrary upstream payloads into a common shape
export function normalizeProvinces(input: any): Array<{ id: string; name: string }> {
  if (Array.isArray(input)) {
    return input.map((p: any, i: number) => ({ id: String(p.id ?? p.code ?? i), name: String(p.name ?? p.title ?? p.province ?? "") })).filter((p) => p.name)
  }
  if (input && Array.isArray(input.provinces)) return normalizeProvinces(input.provinces)
  if (input && Array.isArray(input.data)) return normalizeProvinces(input.data)
  return []
}

export function normalizeCities(input: any): Array<{ id: string; name: string }> {
  if (Array.isArray(input)) {
    return input.map((c: any, i: number) => ({ id: String(c.id ?? c.code ?? i), name: String(c.name ?? c.title ?? c.city ?? "") })).filter((c) => c.name)
  }
  if (input && Array.isArray(input.cities)) return normalizeCities(input.cities)
  if (input && Array.isArray(input.data)) return normalizeCities(input.data)
  return []
}
