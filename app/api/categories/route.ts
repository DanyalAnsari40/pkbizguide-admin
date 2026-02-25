import { NextRequest, NextResponse } from "next/server"
import { getModels } from "@/lib/models"

export const runtime = "nodejs"

function titleCase(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export async function PATCH(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Unsupported content type" }, { status: 415 })
    }
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "").trim()
    const slug = String(body.slug || "").trim()
    if (!slug) return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 })
    const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")

    const { categories } = await getModels()

    if (action === "updateCategoryName") {
      const newNameRaw = String(body.newName || "").trim()
      if (!newNameRaw) return NextResponse.json({ ok: false, error: "newName is required" }, { status: 400 })
      const newSlug = toSlug(newNameRaw)
      // Ensure slug uniqueness if changed
      await categories.updateOne(
        { slug },
        { $set: { name: newNameRaw, slug: newSlug } } as any
      )
      const doc = await categories.findOne({ slug: newSlug })
      return NextResponse.json({ ok: true, category: doc })
    }

    if (action === "updateCategoryImage") {
      const imageDataUrl = String(body.imageDataUrl || "")
      if (!imageDataUrl) return NextResponse.json({ ok: false, error: "imageDataUrl is required" }, { status: 400 })
      let uploaded = await uploadToCloudinary(imageDataUrl)
      if (!uploaded) uploaded = { url: imageDataUrl, public_id: "inline-data-url" }
      await categories.updateOne(
        { slug },
        { $set: { imageUrl: uploaded.url, imagePublicId: uploaded.public_id } } as any
      )
      const doc = await categories.findOne({ slug })
      return NextResponse.json({ ok: true, category: doc })
    }

    if (action === "addSubcategory") {
      const subNameRaw = String(body.subName || "").trim()
      if (!subNameRaw) return NextResponse.json({ ok: false, error: "subName is required" }, { status: 400 })
      const subSlug = toSlug(subNameRaw)
      const exists = await categories.findOne({ slug, "subcategories.slug": subSlug })
      if (!exists) {
        await categories.updateOne(
          { slug },
          { $push: { subcategories: { slug: subSlug, name: subNameRaw, count: 0 } } } as any
        )
      }
      const doc = await categories.findOne({ slug })
      return NextResponse.json({ ok: true, category: doc })
    }

    if (action === "renameSubcategory") {
      const subSlug = String(body.subSlug || "").trim()
      const newNameRaw = String(body.newName || "").trim()
      if (!subSlug || !newNameRaw) return NextResponse.json({ ok: false, error: "subSlug and newName are required" }, { status: 400 })
      const newSubSlug = toSlug(newNameRaw)
      // Update name; for slug change, pull then push to ensure index updates
      const hit = await categories.updateOne(
        { slug, "subcategories.slug": subSlug },
        { $set: { "subcategories.$.name": newNameRaw, "subcategories.$.slug": newSubSlug } } as any
      )
      if (hit.matchedCount === 0) return NextResponse.json({ ok: false, error: "Subcategory not found" }, { status: 404 })
      const doc = await categories.findOne({ slug })
      return NextResponse.json({ ok: true, category: doc })
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production'
    const message = (err as any)?.message || 'Failed to update category'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to update category' : message },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = (searchParams.get("slug") || "").trim()
    const subSlug = (searchParams.get("subSlug") || "").trim()
    if (!slug) return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 })
    const { categories } = await getModels()

    if (subSlug) {
      const res = await categories.updateOne(
        { slug },
        { $pull: { subcategories: { slug: subSlug } } } as any
      )
      if (res.modifiedCount === 0) return NextResponse.json({ ok: false, error: "Subcategory not found" }, { status: 404 })
      const doc = await categories.findOne({ slug })
      return NextResponse.json({ ok: true, category: doc })
    }

    const del = await categories.deleteOne({ slug })
    if (del.deletedCount === 0) return NextResponse.json({ ok: false, error: "Category not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production'
    const message = (err as any)?.message || 'Failed to delete'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to delete' : message },
      { status: 500, headers: corsHeaders() }
    )
  }
}

async function uploadToCloudinary(dataUrl: string): Promise<{ url: string; public_id: string } | null> {
  try {
    const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl)
    if (!match) return null
    const base64 = match[2]
    const buffer = Buffer.from(base64, 'base64')
    return await new Promise((resolve, reject) => {
      const stream = (require("@/lib/cloudinary").default as any).uploader.upload_stream(
        {
          folder: "citation/category-images",
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto", width: 300, height: 300, crop: "fit" }],
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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Unsupported content type" }, { status: 415 })
    }
    const body = await req.json().catch(() => ({}))
    const categoryRaw = String(body.category || "").trim()
    const subCategoryRaw = String(body.subCategory || "").trim()
    const imageDataUrl = String(body.imageDataUrl || "")

    if (!categoryRaw) {
      return NextResponse.json({ ok: false, error: "Category is required" }, { status: 400 })
    }
    if (!imageDataUrl || imageDataUrl.length > 3_000_000) {
      return NextResponse.json({ ok: false, error: "Valid image is required (<=3MB)" }, { status: 400 })
    }

    // Normalize slugs
    const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
    const category = toSlug(categoryRaw)
    const subCategory = subCategoryRaw ? toSlug(subCategoryRaw) : ""

    const { categories } = await getModels()

    // Upload image
    let uploaded = await uploadToCloudinary(imageDataUrl)
    if (!uploaded) {
      // Fallback: persist inline data URL when Cloudinary is not configured
      uploaded = { url: imageDataUrl, public_id: "inline-data-url" }
    }

    // Upsert category with imageUrl
    await categories.updateOne(
      { slug: category },
      (
        {
          $setOnInsert: { name: titleCase(category), slug: category, createdAt: new Date() },
          $set: { imageUrl: uploaded.url, imagePublicId: uploaded.public_id },
        } as any
      ),
      { upsert: true }
    )

    // Upsert optional subcategory
    if (subCategory) {
      const upd = await categories.updateOne(
        { slug: category, "subcategories.slug": subCategory },
        { $set: { "subcategories.$.name": titleCase(subCategory) } }
      )
      if (upd.matchedCount === 0) {
        await categories.updateOne(
          { slug: category },
          (
            {
              $push: { subcategories: { slug: subCategory, name: titleCase(subCategory), count: 0 } },
            } as any
          )
        )
      }
    }

    // Return updated category
    const doc = await categories.findOne({ slug: category })
    return NextResponse.json({ ok: true, category: doc }, { status: 201 })
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production'
    const message = (err as any)?.message || 'Failed to add category'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to add category' : message },
      { status: 500, headers: corsHeaders() }
    )
  }
}

function corsHeaders(origin?: string) {
  const allowed = process.env.DIRECTORY_ORIGIN || origin || "*"
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: corsHeaders(req.headers.get("origin") || undefined) })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const slug = (searchParams.get("slug") || "").trim()

    const { categories } = await getModels()

    // If a specific category is requested, include subcategories in the response
    if (slug) {
      const doc = await categories.findOne({ slug })
      if (!doc) {
        // Return 200 with empty payload to avoid frontend hard-failing on 404
        return NextResponse.json({ ok: true, category: null })
      }
      const subcategories = Array.isArray((doc as any).subcategories)
        ? (doc as any).subcategories.map((s: any) => ({
            slug: String(s?.slug || ""),
            name: String(s?.name || ""),
            count: typeof s?.count === "number" ? s.count : 0,
          }))
        : []
      return NextResponse.json({
        ok: true,
        category: {
          slug: doc.slug,
          name: (doc as any).name || titleCase(String(doc.slug || "")),
          imageUrl: (doc as any)?.imageUrl || undefined,
          subcategories,
        },
      })
    }

    const filter: any = {}
    if (q) {
      const regex = new RegExp(q, "i")
      filter.$or = [{ slug: regex }, { name: regex }]
    }

    const docs = await categories
      .find(filter)
      .project({ slug: 1, name: 1, count: 1, imageUrl: 1 })
      .sort({ name: 1, slug: 1 })
      .toArray()

    const data = docs.map((c) => ({
      slug: c.slug,
      name: c.name || titleCase(String(c.slug || "")),
      count: typeof c.count === "number" ? c.count : 0,
      imageUrl: (c as any)?.imageUrl || undefined,
    }))

    return NextResponse.json(
      { ok: true, categories: data },
      { headers: corsHeaders(req.headers.get("origin") || undefined) }
    )
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production'
    const message = (err as any)?.message || 'Failed to fetch categories'
    return NextResponse.json(
      { ok: false, error: isProd ? 'Failed to fetch categories' : message },
      { status: 500, headers: corsHeaders() }
    )
  }
}
