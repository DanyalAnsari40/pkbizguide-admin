import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getModels } from "@/lib/models"
import { authenticateAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const admin = await authenticateAdmin(req)
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get("businessId") || ""
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)))

    if (!businessId || (!ObjectId.isValid(businessId) && typeof businessId !== 'string')) {
      return NextResponse.json({ ok: false, error: "Invalid businessId" }, { status: 400 })
    }

    const { reviews } = await getModels()

    const asObjectId = ObjectId.isValid(businessId) ? new ObjectId(businessId) : null
    const filter: any = {
      $or: [
        ...(asObjectId ? [{ businessId: asObjectId }] : []),
        { businessId: businessId },
        ...(asObjectId ? [{ business_id: asObjectId }] : []),
        { business_id: businessId },
      ],
    }

    const total = await reviews.countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))
    const currentPage = Math.min(page, pages)

    const data = await reviews
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      ok: true,
      data: {
        reviews: data.map((r: any) => ({
          _id: String(r._id),
          businessId: r.businessId ? String(r.businessId) : (r.business_id ? String(r.business_id) : ""),
          name: r.name,
          rating: r.rating,
          comment: r.comment,
          status: r.status || "visible",
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        pagination: { page: currentPage, limit, total, pages },
      },
    })
  } catch (e: any) {
    const isProd = process.env.NODE_ENV === "production"
    return NextResponse.json({ ok: false, error: isProd ? "Failed to fetch reviews" : e?.message || "Error" }, { status: 500 })
  }
}
