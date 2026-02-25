import { NextResponse } from "next/server"

export async function GET() {
  // Static provinces for Pakistan to avoid external dependency and CORS
  const provinces = [
    { id: "Punjab", name: "Punjab" },
    { id: "Sindh", name: "Sindh" },
    { id: "KPK", name: "Khyber Pakhtunkhwa" },
    { id: "Balochistan", name: "Balochistan" },
    { id: "GB", name: "Gilgit Baltistan" },
    { id: "AJK", name: "Azad Jammu & Kashmir" },
  ]
  return NextResponse.json(provinces)
}
