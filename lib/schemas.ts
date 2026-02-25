import { z } from "zod"

// Incoming payload from the public form
// Base object used for both CreateBusinessSchema (with effects) and BusinessSchema (extended)
const CreateBusinessBase = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.string().min(1, "Category is required").max(120),
  subCategory: z.string().optional().default(""),
  province: z.string().min(1, "Province is required").max(120),
  city: z.string().min(1, "City is required").max(120),
  postalCode: z.string().min(1, "Postal code is required"),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().min(1, "Phone is required").max(50),
  contactPerson: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  email: z.string().email("Invalid email address"),
  description: z.string().min(1, "Description is required").max(4000),
  // Bank-specific
  swiftCode: z.string().optional().default(""),
  branchCode: z.string().optional().default(""),
  cityDialingCode: z.string().optional().default(""),
  iban: z.string().optional().default(""),
  // Optional social/contact links for Get in touch section
  websiteUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  gmbUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
})

export const CreateBusinessSchema = CreateBusinessBase.superRefine((data, ctx) => {
  const isBank = (data.category || "").trim().toLowerCase() === "bank"
  if (!isBank) return
  const requiredForBank: Array<[keyof typeof data, string]> = [
    ["swiftCode", "Swift Code is required for Bank"],
    ["branchCode", "Branch Code is required for Bank"],
    ["cityDialingCode", "City Dialing Code is required for Bank"],
    ["iban", "IBAN is required for Bank"],
  ]
  for (const [field, message] of requiredForBank) {
    const v = String((data as any)[field] ?? "").trim()
    if (!v) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field as string], message })
    }
  }
})

// Full document persisted to the database
export const BusinessSchema = CreateBusinessBase.extend({
  slug: z.string().min(1).max(140),
  logoUrl: z.string().url().optional(),
  logoPublicId: z.string().optional(),
  // For cases where the client sends a small inline base64 image
  logoDataUrl: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  source: z.enum(["admin", "frontend"]).default("frontend"),
  featured: z.boolean().default(false),
  featuredAt: z.date().optional(),
  createdAt: z.date(),
})

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>
export type BusinessDoc = z.infer<typeof BusinessSchema>
