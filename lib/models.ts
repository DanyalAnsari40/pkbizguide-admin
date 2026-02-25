import clientPromise from "./mongodb"

let indexesEnsured = false

// Centralized access to MongoDB collections used by the app
export async function getModels() {
  const client = await clientPromise
  const db = client.db("BizBranches")

  const businesses = db.collection("businesses")
  const categories = db.collection("categories")
  const reviews = db.collection("reviews")
  const users = db.collection("users")

  if (!indexesEnsured) {
    try {
      await Promise.all([
        // Existing indexes
        businesses.createIndex({ status: 1, createdAt: -1 }).catch(() => {}),
        businesses.createIndex({ slug: 1 }, { sparse: true }).catch(() => {}),
        categories.createIndex({ slug: 1 }, { sparse: true }).catch(() => {}),
        
        // Performance optimization indexes
        businesses.createIndex({ featured: 1, status: 1, featuredAt: -1 }).catch(() => {}),
        businesses.createIndex({ status: 1, reviewedBy: 1 }).catch(() => {}),
        businesses.createIndex({ createdBy: 1, status: 1 }).catch(() => {}),
        businesses.createIndex({ reviewedAt: -1 }).catch(() => {}),
        businesses.createIndex({ category: 1, city: 1 }).catch(() => {}),
      ])
    } catch {}
    indexesEnsured = true
  }

  return {
    db,
    businesses,
    categories,
    reviews,
    users,
  }
}
