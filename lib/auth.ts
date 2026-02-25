import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export interface AdminUser {
  id: string
  email: string
  name?: string
  role: "admin" | "user"
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "24h" })
}

export function verifyToken(token: string): AdminUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminUser
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // Also check cookies
  const token = request.cookies.get("admin-token")?.value
  return token || null
}

export async function authenticateAdmin(request: NextRequest): Promise<AdminUser | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null

  return verifyToken(token)
}
