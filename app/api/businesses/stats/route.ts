import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { authenticateAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("BizBranches")
    const collection = db.collection("businesses")

    // Get status counts
    const statusCounts = await collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivity = await collection
      .aggregate([
        {
          $match: {
            reviewedAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              status: "$status",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$reviewedAt",
                },
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.date": -1 },
        },
      ])
      .toArray()

    // Get reviewer stats
    const reviewerStats = await collection
      .aggregate([
        {
          $match: {
            reviewedBy: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$reviewedBy",
            totalReviewed: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
            },
          },
        },
      ])
      .toArray()

    const stats = {
      total: statusCounts.reduce((sum, item) => sum + item.count, 0),
      pending: statusCounts.find((item) => item._id === "pending")?.count || 0,
      approved: statusCounts.find((item) => item._id === "approved")?.count || 0,
      rejected: statusCounts.find((item) => item._id === "rejected")?.count || 0,
      recentActivity,
      reviewerStats,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching business stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
