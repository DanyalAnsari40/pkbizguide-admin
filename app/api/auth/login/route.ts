import { type NextRequest, NextResponse } from "next/server"
import { generateToken } from "@/lib/auth"
import { getModels } from "@/lib/models"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const models = await getModels()
    
    // Find user in database
    const user = await models.users.findOne({ email })
    
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Update last login
    await models.users.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    )

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "user",
    }

    const token = generateToken(userPayload)

    return NextResponse.json({
      success: true,
      token,
      user: userPayload,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
