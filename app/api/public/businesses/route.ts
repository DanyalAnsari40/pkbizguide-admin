import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "*"
  const allowed = process.env.DIRECTORY_ORIGIN
  const allow = allowed && origin === allowed ? origin : ""
  const headers = new Headers()
  if (allow) headers.set("Access-Control-Allow-Origin", allow)
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  headers.set("Access-Control-Max-Age", "86400")
  return headers
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100)
    const search = (searchParams.get("search") || "").trim()
    const city = (searchParams.get("city") || "").trim()
    const category = (searchParams.get("category") || "").trim()

    const query: any = { status: "approved" }
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { contactPersonName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ]
    }
    if (city) query.city = { $regex: `^${city}$`, $options: "i" }
    if (category) query.category = { $regex: `^${category}$`, $options: "i" }

    const client = await clientPromise
    const db = client.db("BizBranches")
    const collection = db.collection("businesses")

    const total = await collection.countDocuments(query)

    const raw = await collection
      .find(query)
      .project({
        // Internal canonical fields
        name: 1,
        contactPerson: 1,
        category: 1,
        city: 1,
        address: 1,
        phone: 1,
        whatsapp: 1,
        email: 1,
        websiteUrl: 1,
        description: 1,
        postalCode: 1,
        logoUrl: 1,
        logoDataUrl: 1,
        createdAt: 1,
        _id: 1,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Map to legacy/public contract
    const businesses = raw.map((b: any) => ({
      _id: b._id,
      businessName: b.name ?? b.businessName, // fallback if legacy docs exist
      contactPersonName: b.contactPerson ?? b.contactPersonName,
      category: b.category,
      city: b.city,
      address: b.address,
      phone: b.phone,
      whatsapp: b.whatsapp,
      email: b.email,
      website: b.websiteUrl ?? b.website,
      description: b.description,
      postalCode: b.postalCode ?? b.zipCode,
      logoUrl: b.logoUrl,
      logoDataUrl: b.logoDataUrl,
      createdAt: b.createdAt,
    }))

    return new NextResponse(
      JSON.stringify({ businesses, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }),
      { status: 200, headers: corsHeaders(request) },
    )
  } catch (error) {
    console.error("Error fetching public businesses:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders(request),
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
