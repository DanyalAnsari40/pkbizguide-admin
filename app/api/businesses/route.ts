import { NextResponse, NextRequest } from "next/server"
import { getModels } from "@/lib/models"
import { CreateBusinessSchema, BusinessSchema } from "@/lib/schemas"
import cloudinary, { isConfigured as isCloudinaryConfigured } from "@/lib/cloudinary"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function titleCase(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

async function uploadToCloudinary(file: File): Promise<{ url: string; public_id: string } | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "citation/business-logos",
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto", width: 200, height: 200, crop: "fit" }],
        },
        (error: any, result?: { secure_url: string; public_id: string }) => {
          if (error || !result) return reject(error)
          resolve({ url: result.secure_url, public_id: result.public_id })
        },
      )
      stream.end(buffer)
    })
  } catch (e) {
    return null
  }
}

// GET endpoint for retrieving businesses
export async function GET(req: NextRequest) {
  try {
    console.log('=== BUSINESSES API CALLED ===', req.url)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const province = searchParams.get('province')
    const city = searchParams.get('city')
    const area = searchParams.get('area')
    const status = searchParams.get('status')
    const reviewed = searchParams.get('reviewed')
    const source = searchParams.get('source')
    const history = searchParams.get('history')
    const createdBy = searchParams.get('createdBy')
    const q = searchParams.get('q')
    const slug = searchParams.get('slug')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const models = await getModels()
    
    // Debug: Count total businesses
    const totalCount = await models.businesses.countDocuments({})
    console.log('Total businesses in database:', totalCount)
    
    // If requesting a single business by slug
    if (slug) {
      const business = await models.businesses.findOne({ slug })
      if (!business) {
        return NextResponse.json(
          { ok: false, error: 'Business not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        ok: true,
        business: { ...business, id: business._id.toString() }
      })
    }

    // If requesting a single business by ID
    if (id) {
      let business = null
      try {
        const objectId = new (require('mongodb')).ObjectId(id)
        business = await models.businesses.findOne({ _id: objectId })
      } catch {
        // id might actually be a slug string passed as id; try slug lookup
        business = await models.businesses.findOne({ slug: id })
      }
      if (!business) {
        return NextResponse.json(
          { ok: false, error: 'Business not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        ok: true,
        business: { ...business, id: business._id.toString() }
      })
    }
    
    // Build filter object for multiple businesses
    const filter: any = {}
    if (category) filter.category = category
    if (province) filter.province = province
    if (city) filter.city = city
    if (area) filter.area = area
    if (status) filter.status = status
    if (reviewed === 'reviewed') filter.reviewedBy = { $exists: true }
    if (reviewed === 'not-reviewed') filter.reviewedBy = { $exists: false }
    if (source) filter.source = source
    if (createdBy) {
      try {
        const objectId = new ObjectId(createdBy)
        filter.$or = [
          { createdBy: objectId },
          { createdBy: createdBy },
          { createdBy: createdBy.toString() }
        ]
        console.log('Filtering by createdBy with $or:', filter.$or)
        
        // Debug: Check what businesses exist with any createdBy
        const allBusinesses = await models.businesses.find({}, { projection: { name: 1, createdBy: 1 } }).limit(10).toArray()
        console.log('Sample businesses in DB:', allBusinesses)
        
        // Debug: Check if any businesses have createdBy field
        const businessesWithCreatedBy = await models.businesses.find({ createdBy: { $exists: true } }, { projection: { name: 1, createdBy: 1 } }).limit(5).toArray()
        console.log('Businesses with createdBy field:', businessesWithCreatedBy)
        
        // Debug: Check businesses with this specific user
        const userBusinesses = await models.businesses.find(filter, { projection: { name: 1, createdBy: 1 } }).toArray()
        console.log('Businesses found for user:', userBusinesses)
      } catch {
        filter.createdBy = createdBy
        console.log('Filtering by createdBy string:', filter.createdBy)
      }
      console.log('Final filter for businesses:', filter)
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i')
      filter.$or = [
        { name: regex },
        { description: regex },
        { category: regex },
        { province: regex },
        { city: regex },
        { area: regex },
      ]
    }



    const skip = (page - 1) * limit
    
    let businesses
    
    if (history === 'true') {
      // For history view, join with users to get creator names
      businesses = await models.businesses.aggregate([
        { $match: filter },
        {
          $addFields: {
            createdByObjId: {
              $cond: {
                if: { $eq: [{ $type: "$createdBy" }, "string"] },
                then: { $toObjectId: "$createdBy" },
                else: "$createdBy"
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { createdById: "$createdByObjId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$createdById"] }
                }
              }
            ],
            as: 'creator'
          }
        },
        {
          $addFields: {
            createdByName: { $arrayElemAt: ['$creator.name', 0] }
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]).toArray()
    } else {
      // Optimize query with better indexing and reduced projection
      businesses = await models.businesses
        .find(filter, {
          projection: {
            businessName: 1,
            name: 1,
            email: 1,
            phone: 1,
            website: 1,
            address: 1,
            city: 1,
            state: 1,
            postalCode: 1,
            category: 1,
            subCategory: 1,
            description: 1,
            websiteUrl: 1,
            facebookUrl: 1,
            gmbUrl: 1,
            youtubeUrl: 1,
            swiftCode: 1,
            branchCode: 1,
            cityDialingCode: 1,
            iban: 1,
            status: 1,
            featured: 1,
            featuredAt: 1,
            createdAt: 1,
            updatedAt: 1,
            reviewedBy: 1,
            reviewedAt: 1,
            rejectionReason: 1,
            logoUrl: 1,
            logoDataUrl: 1,
            slug: 1,
            createdBy: 1,
            source: 1,
          },
        })
        .sort({ status: 1, createdAt: -1 }) // Optimize sort for better performance
        .skip(skip)
        .limit(limit)
        .toArray()
    }

    const total = await models.businesses.countDocuments(filter)



    // Add id field for each business
    const businessesWithId = businesses.map(business => ({
      ...business,
      id: business._id.toString()
    }))

    return NextResponse.json({
      ok: true,
      businesses: businessesWithId,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching businesses:', error)
    const isProd = process.env.NODE_ENV === 'production'
    const message = (error as any)?.message || 'Failed to fetch businesses'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to fetch businesses' : message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    // Detect admin by Authorization header or admin-token cookie
    const authHeader = req.headers.get("authorization") || ""
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
    const cookieHeader = req.headers.get("cookie") || ""
    const cookieToken = /(?:^|; )admin-token=([^;]+)/.exec(cookieHeader)?.[1] || null
    const adminPayload = verifyToken(bearer || cookieToken || "")
    const isAdmin = !!adminPayload

    // Support both JSON and multipart/form-data payloads
    let body: any = {}
    let fileFromForm: File | null = null
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const pick = (k: string) => String(form.get(k) ?? "").trim()
      body = {
        businessName: pick("businessName"),
        contactPersonName: pick("contactPersonName"),
        category: pick("category"),
        subCategory: pick("subCategory"),
        province: pick("province"),
        city: pick("city"),
        postalCode: pick("postalCode"),
        address: pick("address"),
        phone: pick("phone"),
        whatsapp: pick("whatsapp"),
        email: pick("email"),
        description: pick("description"),
        websiteUrl: pick("websiteUrl"),
        facebookUrl: pick("facebookUrl"),
        gmbUrl: pick("gmbUrl"),
        youtubeUrl: pick("youtubeUrl"),
        swiftCode: pick("swiftCode"),
        branchCode: pick("branchCode"),
        cityDialingCode: pick("cityDialingCode"),
        iban: pick("iban"),
        logoDataUrl: pick("logoDataUrl"),
      }
      const f = form.get("logoFile")
      fileFromForm = (f instanceof File) ? f : null

    } else if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}))

    } else {
      // Fallback: try JSON first, then formData
      body = await req.json().catch(async () => {
        const form = await req.formData().catch(() => null)
        if (form) {
          const pick = (k: string) => String(form.get(k) ?? "").trim()
          const f = form.get("logoFile")
          fileFromForm = (f instanceof File) ? f : null
          return {
            businessName: pick("businessName"),
            contactPersonName: pick("contactPersonName"),
            category: pick("category"),
            subCategory: pick("subCategory"),
            province: pick("province"),
            city: pick("city"),
            postalCode: pick("postalCode"),
            address: pick("address"),
            phone: pick("phone"),
            whatsapp: pick("whatsapp"),
            email: pick("email"),
            description: pick("description"),
            websiteUrl: pick("websiteUrl"),
            facebookUrl: pick("facebookUrl"),
            gmbUrl: pick("gmbUrl"),
            youtubeUrl: pick("youtubeUrl"),
            swiftCode: pick("swiftCode"),
            branchCode: pick("branchCode"),
            cityDialingCode: pick("cityDialingCode"),
            iban: pick("iban"),
            logoDataUrl: pick("logoDataUrl"),
          }
        }
        return {}
      })
    }

    // Map frontend field names to API schema
    const mapped = {
      name: String(body.businessName || "").trim(),
      contactPerson: String(body.contactPersonName || "").trim(),
      category: String(body.category || "").trim(),
      subCategory: String(body.subCategory || "").trim(),
      province: String(body.province || "").trim(),
      city: String(body.city || "").trim(),
      postalCode: String(body.postalCode || "").trim(),
      address: String(body.address || "").trim(),
      phone: String(body.phone || "").trim(),
      whatsapp: String(body.whatsapp || "").trim(),
      email: String(body.email || "").trim(),
      description: String(body.description || "").trim(),
      // Optional social/contact links
      websiteUrl: String(body.websiteUrl || "").trim() || undefined,
      facebookUrl: String(body.facebookUrl || "").trim() || undefined,
      gmbUrl: String(body.gmbUrl || "").trim() || undefined,
      youtubeUrl: String(body.youtubeUrl || "").trim() || undefined,
      // Bank-specific
      swiftCode: String(body.swiftCode || "").trim(),
      branchCode: String(body.branchCode || "").trim(),
      cityDialingCode: String(body.cityDialingCode || "").trim(),
      iban: String(body.iban || "").trim(),
    }

    const validationResult = CreateBusinessSchema.safeParse(mapped)
    if (!validationResult.success) {

      return NextResponse.json(
        { ok: false, error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const models = await getModels()

    // Slug generation
    const baseSlug = mapped.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120)
    let uniqueSlug = baseSlug || `business-${Date.now()}`
    let attempt = 0
    while (await models.businesses.findOne({ slug: uniqueSlug })) {
      attempt += 1
      uniqueSlug = `${baseSlug}-${attempt}`
    }

    // Optional inline logo data sent by the form
    const logoDataUrl = typeof body.logoDataUrl === 'string' && body.logoDataUrl.length <= 2_500_000
      ? body.logoDataUrl
      : undefined

    // Store createdBy as ObjectId for proper lookup
    let createdByValue = null
    if (adminPayload?.id) {
      try {
        createdByValue = new ObjectId(adminPayload.id)
        console.log('Setting createdBy to ObjectId:', createdByValue, 'for user:', adminPayload.id)
      } catch {
        // If id is already ObjectId or invalid, use as is
        createdByValue = adminPayload.id
        console.log('Setting createdBy to string:', createdByValue, 'for user:', adminPayload.id)
      }
    } else {
      console.log('No adminPayload.id found, createdBy will be null')
    }

    // Try to upload logo to Cloudinary if inline data URL provided
    let logoUrl: string | undefined
    let logoPublicId: string | undefined
    if (logoDataUrl && /^data:image\//.test(logoDataUrl)) {
      try {

        const base64 = logoDataUrl.split(',')[1] || ''
        const buffer = Buffer.from(base64, 'base64')
        const uploaded = await new Promise<{ url: string; public_id: string }>((resolve, reject) => {
          const stream = (cloudinary as any).uploader.upload_stream(
            {
              folder: 'citation/business-logos',
              resource_type: 'image',
              transformation: [{ quality: 'auto', fetch_format: 'auto', width: 200, height: 200, crop: 'fit' }],
            },
            (error: any, result?: { secure_url: string; public_id: string }) => {
              if (error || !result) return reject(error)
              resolve({ url: result.secure_url, public_id: result.public_id })
            }
          )
          stream.end(buffer)
        })
        logoUrl = uploaded.url
        logoPublicId = uploaded.public_id

      } catch (e) {

        // keep fallback logoDataUrl
      }
    } else if (!logoUrl && fileFromForm) {
      try {

        const arrayBuffer = await fileFromForm.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploaded = await new Promise<{ url: string; public_id: string }>((resolve, reject) => {
          const stream = (cloudinary as any).uploader.upload_stream(
            {
              folder: 'citation/business-logos',
              resource_type: 'image',
              transformation: [{ quality: 'auto', fetch_format: 'auto', width: 200, height: 200, crop: 'fit' }],
            },
            (error: any, result?: { secure_url: string; public_id: string }) => {
              if (error || !result) return reject(error)
              resolve({ url: result.secure_url, public_id: result.public_id })
            }
          )
          stream.end(buffer)
        })
        logoUrl = uploaded.url
        logoPublicId = uploaded.public_id

      } catch (e) {

        // ignore and proceed without logo
      }
    }

    // Normalize logoUrl to undefined if it's not a valid http(s) URL
    const normalizedLogoUrl = logoUrl && /^https?:\/\//i.test(logoUrl) ? logoUrl : undefined
    const businessDoc = {
      ...mapped,
      slug: uniqueSlug,
      logoDataUrl: normalizedLogoUrl ? undefined : logoDataUrl,
      logoUrl: normalizedLogoUrl,
      logoPublicId: logoPublicId || undefined,
      status: isAdmin ? "approved" : "pending",
      source: isAdmin ? "admin" : "frontend",
      createdBy: createdByValue,
      createdAt: new Date(),
    }
    
    console.log('Business doc before validation:', { createdBy: businessDoc.createdBy })
    const parsed = BusinessSchema.safeParse(businessDoc)

    if (!parsed.success) {

      return NextResponse.json(
        { ok: false, error: "Business document invalid", details: parsed.error.errors },
        { status: 400 }
      )
    }
    
    // Skip schema validation for createdBy field and add it manually
    const finalBusinessDoc = {
      ...parsed.data,
      createdBy: createdByValue
    }

    console.log('Final business document createdBy:', finalBusinessDoc.createdBy, 'type:', typeof finalBusinessDoc.createdBy)
    console.log('About to insert business doc:', { name: finalBusinessDoc.name, createdBy: finalBusinessDoc.createdBy })
    const result = await models.businesses.insertOne(finalBusinessDoc)
    console.log('Business created with ID:', result.insertedId)
    
    // Verify the business was created with correct createdBy
    const createdBusiness = await models.businesses.findOne({ _id: result.insertedId })
    console.log('Verified created business createdBy:', createdBusiness?.createdBy)

    const parentSlug = mapped.category
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
    await models.categories.updateOne(
      { slug: parentSlug },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          name: titleCase(mapped.category),
          slug: parentSlug,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )

    if (mapped.subCategory) {
      const subSlug = mapped.subCategory
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
      // Try to increment existing subcategory count
      const upd = await models.categories.updateOne(
        { slug: parentSlug, "subcategories.slug": subSlug },
        { $inc: { "subcategories.$.count": 1 } }
      )
      // If not found, push a new subcategory entry with initial count 1
      if (upd.matchedCount === 0) {
        await models.categories.updateOne(
          { slug: parentSlug },
          (
            {
              $push: {
                subcategories: { slug: subSlug, name: titleCase(mapped.subCategory), count: 1 },
              },
            } as any
          )
        )
      }
    }

    // Respond
    return NextResponse.json(
      { ok: true, id: result.insertedId, business: { ...finalBusinessDoc, _id: result.insertedId } },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("Business creation error:", err)
    const isProd = process.env.NODE_ENV === 'production'
    const message = err?.message || 'Internal server error'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Internal server error' : message },
      { status: 500 }
    )
  }
}
