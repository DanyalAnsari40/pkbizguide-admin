import { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  const base = process.env.LEOPARDS_API_BASE_URL
  const apiKey = process.env.LEOPARDS_API_KEY
  const apiPassword = process.env.LEOPARDS_API_PASSWORD

  if (!base || !apiKey || !apiPassword) {
    return Response.json({ ok: false, error: "API configuration missing" }, { status: 500 })
  }

  try {
    const res = await fetch(`${base}/getAllCities/format/json/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
      cache: "no-store",
    })

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = {} }

    if (!res.ok) {
      return Response.json({ ok: false, error: data?.error || `Upstream error ${res.status}`, details: data, upstreamRaw: text })
    }

    if (String(data?.status) !== "1" || !Array.isArray(data?.city_list)) {
      return Response.json({ ok: false, error: "Invalid response", details: data, upstreamRaw: text })
    }

    // Normalize city_list to { id, name }
    const cities = data.city_list.map((c: any) => ({
      id: c?.id ?? c?.CityId ?? c?.city_id ?? c?.code ?? String(c?.name ?? c?.CityName ?? ""),
      name: c?.name ?? c?.CityName ?? c?.city_name ?? String(c?.id ?? c?.CityId ?? c?.city_id ?? c?.code ?? ""),
    }))

    return Response.json({ ok: true, cities })
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || "Failed to fetch cities" }, { status: 500 })
  }
}
