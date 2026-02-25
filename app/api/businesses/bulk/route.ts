import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { authenticateAdmin } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { businessIds, status, rejectionReason } = await request.json()

    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json({ error: "Business IDs are required" }, { status: 400 })
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("BizBranches")
    const collection = db.collection("businesses")

    const updateData: any = {
      status,
      updatedAt: new Date(),
      reviewedBy: admin.email,
      reviewedAt: new Date(),
    }

    if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    // Convert string IDs to ObjectIds
    const objectIds = businessIds.map((id: string) => new ObjectId(id))

    const result = await collection.updateMany({ _id: { $in: objectIds } }, { $set: updateData })

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    })
  } catch (error) {
    console.error("Error bulk updating businesses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
