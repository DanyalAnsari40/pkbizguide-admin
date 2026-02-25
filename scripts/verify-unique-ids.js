const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function verifyUniqueIds() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('BizBranches')
    const businesses = db.collection('businesses')
    
    console.log('🔍 Verifying Unique IDs for Featured Businesses...\n')
    
    // Get all featured businesses
    const featuredBusinesses = await businesses
      .find({ featured: true })
      .project({ _id: 1, name: 1, businessName: 1, featured: 1, featuredAt: 1 })
      .toArray()
    
    console.log(`📊 Found ${featuredBusinesses.length} featured businesses`)
    
    if (featuredBusinesses.length > 0) {
      console.log('\n🆔 Featured Business IDs:')
      featuredBusinesses.forEach((business, index) => {
        console.log(`${index + 1}. ID: ${business._id}`)
        console.log(`   Name: ${business.businessName || business.name}`)
        console.log(`   Featured: ${business.featured}`)
        console.log(`   Featured At: ${business.featuredAt || 'N/A'}`)
        console.log(`   String ID: ${business._id.toString()}`)
        console.log('')
      })
      
      // Verify all IDs are unique
      const ids = featuredBusinesses.map(b => b._id.toString())
      const uniqueIds = [...new Set(ids)]
      
      console.log(`✅ Total IDs: ${ids.length}`)
      console.log(`✅ Unique IDs: ${uniqueIds.length}`)
      
      if (ids.length === uniqueIds.length) {
        console.log('🎉 All featured business IDs are unique!')
      } else {
        console.log('⚠️  Duplicate IDs found!')
      }
      
      // Test ObjectId validation
      console.log('\n🧪 Testing ObjectId validation:')
      featuredBusinesses.forEach((business, index) => {
        try {
          const isValid = ObjectId.isValid(business._id.toString())
          console.log(`${index + 1}. ID ${business._id} is valid: ${isValid}`)
        } catch (error) {
          console.log(`${index + 1}. ID ${business._id} is invalid: ${error.message}`)
        }
      })
    } else {
      console.log('ℹ️  No featured businesses found. Create some featured businesses first!')
    }
    
  } catch (error) {
    console.error('❌ Error verifying IDs:', error)
  } finally {
    await client.close()
  }
}

verifyUniqueIds()
