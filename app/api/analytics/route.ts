import { NextResponse } from "next/server"
import { getModels } from "@/lib/models"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const models = await getModels()

    // Optimize: Get all data in parallel with better projections
    const [grouped, total, recentSubmissions, recentReviews, topUsers] = await Promise.all([
      // Aggregate counts by status in one query
      models.businesses.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]).toArray(),
      
      // Total count
      models.businesses.countDocuments({}),
      
      // Recent submissions with minimal projection
      models.businesses
        .find({}, { projection: { businessName: 1, name: 1, status: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(5) // Reduced from 10 to 5 for faster loading
        .toArray(),
      
      // Recent reviews with minimal projection
      models.businesses
        .find({ reviewedAt: { $exists: true } }, { projection: { businessName: 1, name: 1, status: 1, reviewedAt: 1, rejectionReason: 1 } })
        .sort({ reviewedAt: -1 })
        .limit(5) // Reduced from 10 to 5 for faster loading
        .toArray(),
      
      // Top users aggregation
      models.businesses.aggregate([
        { $match: { createdBy: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$createdBy",
            businessCount: { $sum: 1 },
            approvedCount: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
            }
          }
        },
        { $sort: { businessCount: -1 } },
        { $limit: 3 } // Reduced from 5 to 3 for faster loading
      ]).toArray()
    ])

    const counts: Record<string, number> = {}
    for (const g of grouped) counts[g._id || "unknown"] = g.count

    type ActivityItem = {
      type: "submitted" | "approved" | "rejected"
      title: string
      subtitle?: string
      at: string
    }

    const activities: ActivityItem[] = []
    for (const b of recentSubmissions) {
      const title = (b.businessName || b.name || "Business").toString()
      if (b.createdAt) {
        activities.push({
          type: "submitted",
          title,
          subtitle: `\"${title}\" submitted for review`,
          at: new Date(b.createdAt).toISOString(),
        })
      }
    }
    for (const b of recentReviews) {
      const title = (b.businessName || b.name || "Business").toString()
      if (b.reviewedAt) {
        const type = (b.status === "approved" ? "approved" : "rejected") as ActivityItem["type"]
        activities.push({
          type,
          title,
          subtitle: type === "approved" ? `\"${title}\" has been approved and is now live` : (b.rejectionReason ? `Rejected: ${b.rejectionReason}` : `\"${title}\" was rejected`),
          at: new Date(b.reviewedAt).toISOString(),
        })
      }
    }

    activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    // Get user names for top users (optimized)
    const topUsersWithNames = await Promise.all(
      topUsers.map(async (userStat) => {
        const user = await models.users.findOne(
          { _id: userStat._id },
          { projection: { name: 1, email: 1 } }
        )
        return {
          ...userStat,
          name: user?.name || "Unknown User",
          email: user?.email || ""
        }
      })
    )

    return NextResponse.json({
      ok: true,
      stats: {
        total,
        pending: counts["pending"] || 0,
        approved: counts["approved"] || 0,
        rejected: counts["rejected"] || 0,
      },
      activities: activities.slice(0, 10),
      topUsers: topUsersWithNames,
    })
  } catch (e: any) {
    console.error("/api/analytics error:", e)
    const isProd = process.env.NODE_ENV === "production"
    return NextResponse.json({ ok: false, error: isProd ? "Failed to load analytics" : e?.message || "Error" }, { status: 500 })
  }
}
