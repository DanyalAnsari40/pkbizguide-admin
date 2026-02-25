import { NextResponse, NextRequest } from "next/server"
import { getModels } from "@/lib/models"
import { verifyToken } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
    const adminPayload = verifyToken(token || "")
    
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const models = await getModels()
    
    const users = await models.users.find({}, {
      projection: { password: 0 }
    }).toArray()

    // Get business count for each user
    const usersWithCount = await Promise.all(
      users.map(async (user) => {
        const businessCount = await models.businesses.countDocuments({ 
          $or: [
            { createdBy: user._id },
            { createdBy: user._id.toString() }
          ]
        })
        return {
          ...user,
          businessCount
        }
      })
    )

    return NextResponse.json({ users: usersWithCount })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
    const adminPayload = verifyToken(token || "")
    
    if (!adminPayload || adminPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const models = await getModels()

    // Check if user already exists
    const existingUser = await models.users.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      createdAt: new Date(),
      createdBy: adminPayload.id
    }

    const result = await models.users.insertOne(newUser)

    return NextResponse.json({ 
      success: true, 
      userId: result.insertedId 
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}