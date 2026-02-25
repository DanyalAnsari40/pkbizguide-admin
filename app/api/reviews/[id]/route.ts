import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getModels } from "@/lib/models"
import { authenticateAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await authenticateAdmin(req)
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Unsupported content type" }, { status: 415 })
    }
    const body = await req.json().catch(() => ({}))
    const update: any = {}
    if (typeof body.name === "string") update.name = body.name.trim()
    if (typeof body.comment === "string") update.comment = body.comment.trim()
    if (typeof body.rating === "number") update.rating = Math.max(1, Math.min(5, body.rating))
    if (typeof body.status === "string") update.status = body.status

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 })
    }

    update.updatedAt = new Date()

    const id = params.id
    const or: any[] = [{ _id: id }]
    if (ObjectId.isValid(id)) or.unshift({ _id: new ObjectId(id) })

    const { reviews } = await getModels()
    const result = await reviews.findOneAndUpdate(
      { $or: or },
      { $set: update },
      { returnDocument: "after" }
    )

    const updated = result.value
    if (!updated) return NextResponse.json({ ok: false, error: "Review not found" }, { status: 404 })

    return NextResponse.json({ ok: true, review: {
      _id: String(updated._id),
      businessId: updated.businessId ? String(updated.businessId) : (updated.business_id ? String(updated.business_id) : ""),
      name: updated.name,
      rating: updated.rating,
      comment: updated.comment,
      status: updated.status || "visible",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    } })
  } catch (e: any) {
    const isProd = process.env.NODE_ENV === "production"
    return NextResponse.json({ ok: false, error: isProd ? "Failed to update review" : e?.message || "Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await authenticateAdmin(req)
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    const id = params.id
    const or: any[] = [{ _id: id }]
    if (ObjectId.isValid(id)) or.unshift({ _id: new ObjectId(id) })

    const { reviews } = await getModels()
    const res = await reviews.deleteOne({ $or: or })
    if (res.deletedCount === 0) return NextResponse.json({ ok: false, error: "Review not found" }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const isProd = process.env.NODE_ENV === "production"
    return NextResponse.json({ ok: false, error: isProd ? "Failed to delete review" : e?.message || "Error" }, { status: 500 })
  }
}
