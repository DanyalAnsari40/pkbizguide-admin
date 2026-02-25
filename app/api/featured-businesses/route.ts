import { NextResponse } from "next/server"
import { getModels } from "@/lib/models"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const models = await getModels()

    // Get featured businesses with optimized query
    const featuredBusinesses = await models.businesses
      .find(
        { featured: true, status: "approved" },
        {
          projection: {
            name: 1,
            businessName: 1,
            category: 1,
            city: 1,
            logoUrl: 1,
            logoDataUrl: 1,
            featured: 1,
            featuredAt: 1,
            createdAt: 1,
            slug: 1,
          },
        }
      )
      .sort({ featuredAt: -1 })
      .limit(8) // Reduced from 12 to 8 for faster loading
      .toArray()

    // Add id field for each business
    const businessesWithId = featuredBusinesses.map(business => ({
      ...business,
      id: business._id.toString()
    }))

    return NextResponse.json({
      ok: true,
      featuredBusinesses: businessesWithId,
      count: featuredBusinesses.length
    })
  } catch (error) {
    console.error('Error fetching featured businesses:', error)
    const isProd = process.env.NODE_ENV === 'production'
    const message = (error as any)?.message || 'Failed to fetch featured businesses'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to fetch featured businesses' : message },
      { status: 500 }
    )
  }
}
