import { NextResponse, NextRequest } from "next/server"
import { getModels } from "@/lib/models"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
    const adminPayload = verifyToken(token || "")
    
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, role } = await req.json()
    const models = await getModels()

    await models.users.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { name, email, role, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
    const adminPayload = verifyToken(token || "")
    
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const models = await getModels()
    await models.users.deleteOne({ _id: new ObjectId(params.id) })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}