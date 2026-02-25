import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { authenticateAdmin } from "@/lib/auth"
import { ObjectId } from "mongodb"
import cloudinary from "@/lib/cloudinary"

// Ensure Node.js runtime on Vercel so Buffer and Cloudinary SDK are available
export const runtime = "nodejs"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[PATCH /api/businesses/:id] start id=', params.id)
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""
    console.log('[PATCH /api/businesses/:id] content-type =', contentType)
    let body: any = {}
    let fileFromForm: File | null = null
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      body = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : v]))
      const f = form.get('logoFile')
      fileFromForm = (f instanceof File) ? f : null
      console.log('[PATCH /api/businesses/:id] multipart detected; hasFile =', !!fileFromForm, 'fileSize=', (fileFromForm as any)?.size)
    } else {
      body = await request.json().catch(() => ({}))
      console.log('[PATCH /api/businesses/:id] json detected; hasLogoDataUrl =', typeof body.logoDataUrl === 'string', 'logoDataUrlLen=', typeof body.logoDataUrl === 'string' ? (body.logoDataUrl as string).length : 0)
    }

    // Branch 1: status update (existing behavior) - supports both JSON and multipart
    if (typeof body?.status === 'string' && ["pending", "approved", "rejected"].includes(body.status)) {
      const { status, rejectionReason } = body

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

      const result = await collection.updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    // Branch 1.5: featured status update
    if (typeof body?.featured === 'boolean') {
      const { featured, featuredAt } = body

      const client = await clientPromise
      const db = client.db("BizBranches")
      const collection = db.collection("businesses")

      const updateData: any = {
        featured,
        updatedAt: new Date(),
      }

      if (featured && featuredAt) {
        updateData.featuredAt = new Date(featuredAt)
      } else if (!featured) {
        updateData.featuredAt = null
      }

      const result = await collection.updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    // Branch 2: admin field update (non-breaking) — supports multipart (logoFile) and JSON (logoDataUrl)
    if (body?.action === 'updateFields') {
      const client = await clientPromise
      const db = client.db("BizBranches")
      const collection = db.collection("businesses")

      // Map incoming fields like POST /api/businesses (include legacy aliases to keep UI in sync)
      const nameVal = String(body.businessName || "").trim()
      const contactVal = String(body.contactPersonName || "").trim()
      const websiteVal = String(body.websiteUrl || "").trim()
      const postalVal = String(body.postalCode || "").trim()

      const mapped: any = {
        // canonical
        name: nameVal || undefined,
        contactPerson: contactVal || undefined,
        category: String(body.category || "").trim() || undefined,
        subCategory: String(body.subCategory || "").trim() || undefined,
        province: String(body.province || "").trim() || undefined,
        city: String(body.city || "").trim() || undefined,
        postalCode: postalVal || undefined,
        address: String(body.address || "").trim() || undefined,
        phone: String(body.phone || "").trim() || undefined,
        whatsapp: String(body.whatsapp || "").trim() || undefined,
        email: String(body.email || "").trim() || undefined,
        description: String(body.description || "").trim() || undefined,
        websiteUrl: websiteVal || undefined,
        facebookUrl: String(body.facebookUrl || "").trim() || undefined,
        gmbUrl: String(body.gmbUrl || "").trim() || undefined,
        youtubeUrl: String(body.youtubeUrl || "").trim() || undefined,
        swiftCode: String(body.swiftCode || "").trim() || undefined,
        branchCode: String(body.branchCode || "").trim() || undefined,
        cityDialingCode: String(body.cityDialingCode || "").trim() || undefined,
        iban: String(body.iban || "").trim() || undefined,
        // legacy aliases used by some UI pieces
        businessName: nameVal || undefined,
        contactPersonName: contactVal || undefined,
        website: websiteVal || undefined,
        zipCode: postalVal || undefined,
      }
      Object.keys(mapped).forEach((k) => mapped[k] === undefined && delete mapped[k])

      // Optional logo update: support both base64 data URL and multipart file
      const logoDataUrl: string | undefined = typeof body.logoDataUrl === 'string' ? body.logoDataUrl : undefined
      let logoSet: any = {}
      if (logoDataUrl && /^data:image\//.test(logoDataUrl) && logoDataUrl.length <= 2_500_000) {
        try {
          console.log('[PATCH /api/businesses/:id] uploading logo via base64 data URL to Cloudinary')
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
          logoSet = { logoUrl: uploaded.url, logoPublicId: uploaded.public_id, logoDataUrl: undefined }
          console.log('[PATCH /api/businesses/:id] cloudinary upload success (base64); public_id =', (logoSet as any).logoPublicId)
        } catch {
          console.error('[PATCH /api/businesses/:id] cloudinary upload error (base64)')
          logoSet = { logoDataUrl }
        }
      } else if (fileFromForm) {
        try {
          console.log('[PATCH /api/businesses/:id] uploading logo via file to Cloudinary; size=', (fileFromForm as any)?.size)
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
          logoSet = { logoUrl: uploaded.url, logoPublicId: uploaded.public_id, logoDataUrl: undefined }
          console.log('[PATCH /api/businesses/:id] cloudinary upload success (file); public_id =', (logoSet as any).logoPublicId)
        } catch {
          console.error('[PATCH /api/businesses/:id] cloudinary upload error (file)')
          // ignore file upload errors
        }
      }

      const updateDoc: any = { $set: { ...mapped, ...logoSet, updatedAt: new Date() } }
      const result = await collection.updateOne({ _id: new ObjectId(params.id) }, updateDoc)
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error("Error updating business:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("BizBranches")
    const collection = db.collection("businesses")

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "Missing business id" }, { status: 400 })
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting business:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
