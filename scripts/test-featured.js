const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function testFeaturedFeature() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('BizBranches')
    const businesses = db.collection('businesses')
    
    console.log('🧪 Testing Featured Business Feature...\n')
    
    // 1. Check if any businesses exist
    const totalBusinesses = await businesses.countDocuments({})
    console.log(`📊 Total businesses in database: ${totalBusinesses}`)
    
    // 2. Check featured businesses
    const featuredCount = await businesses.countDocuments({ featured: true })
    console.log(`⭐ Featured businesses: ${featuredCount}`)
    
    // 3. Check approved businesses
    const approvedCount = await businesses.countDocuments({ status: 'approved' })
    console.log(`✅ Approved businesses: ${approvedCount}`)
    
    // 4. Get a sample business to test with
    const sampleBusiness = await businesses.findOne({ status: 'approved' })
    if (sampleBusiness) {
      console.log(`\n🔍 Sample business found: ${sampleBusiness.businessName || sampleBusiness.name}`)
      console.log(`   Current featured status: ${sampleBusiness.featured || false}`)
      
      // 5. Test toggling featured status
      const newFeaturedStatus = !sampleBusiness.featured
      console.log(`\n🔄 Testing featured toggle to: ${newFeaturedStatus}`)
      
      const updateResult = await businesses.updateOne(
        { _id: sampleBusiness._id },
        { 
          $set: { 
            featured: newFeaturedStatus,
            featuredAt: newFeaturedStatus ? new Date() : null,
            updatedAt: new Date()
          }
        }
      )
      
      if (updateResult.modifiedCount > 0) {
        console.log('✅ Successfully updated featured status')
        
        // Verify the update
        const updatedBusiness = await businesses.findOne({ _id: sampleBusiness._id })
        console.log(`   New featured status: ${updatedBusiness.featured}`)
        console.log(`   Featured at: ${updatedBusiness.featuredAt || 'N/A'}`)
        
        // Toggle back to original state
        await businesses.updateOne(
          { _id: sampleBusiness._id },
          { 
            $set: { 
              featured: sampleBusiness.featured,
              featuredAt: sampleBusiness.featuredAt,
              updatedAt: new Date()
            }
          }
        )
        console.log('🔄 Restored original featured status')
      } else {
        console.log('❌ Failed to update featured status')
      }
    } else {
      console.log('⚠️  No approved businesses found to test with')
    }
    
    // 6. Test featured businesses query
    const featuredBusinesses = await businesses
      .find({ featured: true, status: 'approved' })
      .sort({ featuredAt: -1 })
      .limit(5)
      .toArray()
    
    console.log(`\n📋 Featured businesses (latest 5):`)
    featuredBusinesses.forEach((business, index) => {
      console.log(`   ${index + 1}. ${business.businessName || business.name} (${business.category})`)
      console.log(`      Featured: ${business.featuredAt ? new Date(business.featuredAt).toLocaleString() : 'Unknown'}`)
    })
    
    console.log('\n✅ Featured business feature test completed!')
    
  } catch (error) {
    console.error('❌ Error testing featured feature:', error)
  } finally {
    await client.close()
  }
}

testFeaturedFeature()
