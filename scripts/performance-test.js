const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function performanceTest() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('BizBranches')
    const businesses = db.collection('businesses')
    
    console.log('🚀 Performance Test - Citation Admin\n')
    
    // Test 1: Basic count query
    console.log('📊 Test 1: Basic Count Query')
    const start1 = Date.now()
    const totalCount = await businesses.countDocuments({})
    const end1 = Date.now()
    console.log(`   Total businesses: ${totalCount}`)
    console.log(`   Time: ${end1 - start1}ms`)
    
    // Test 2: Featured businesses query
    console.log('\n⭐ Test 2: Featured Businesses Query')
    const start2 = Date.now()
    const featuredCount = await businesses.countDocuments({ featured: true, status: 'approved' })
    const end2 = Date.now()
    console.log(`   Featured businesses: ${featuredCount}`)
    console.log(`   Time: ${end2 - start2}ms`)
    
    // Test 3: Status aggregation
    console.log('\n📈 Test 3: Status Aggregation')
    const start3 = Date.now()
    const statusAgg = await businesses.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray()
    const end3 = Date.now()
    console.log(`   Status breakdown:`, statusAgg)
    console.log(`   Time: ${end3 - start3}ms`)
    
    // Test 4: Recent businesses with projection
    console.log('\n🕒 Test 4: Recent Businesses (with projection)')
    const start4 = Date.now()
    const recentBusinesses = await businesses
      .find({}, { 
        projection: { 
          businessName: 1, 
          name: 1, 
          status: 1, 
          createdAt: 1,
          featured: 1,
          category: 1,
          city: 1
        } 
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
    const end4 = Date.now()
    console.log(`   Recent businesses: ${recentBusinesses.length}`)
    console.log(`   Time: ${end4 - start4}ms`)
    
    // Test 5: Complex query with filters
    console.log('\n🔍 Test 5: Complex Query (with filters)')
    const start5 = Date.now()
    const filteredBusinesses = await businesses
      .find({ 
        status: 'approved',
        featured: { $exists: true }
      }, { 
        projection: { 
          businessName: 1, 
          name: 1, 
          status: 1, 
          featured: 1,
          category: 1,
          city: 1,
          logoUrl: 1
        } 
      })
      .sort({ featuredAt: -1 })
      .limit(8)
      .toArray()
    const end5 = Date.now()
    console.log(`   Filtered businesses: ${filteredBusinesses.length}`)
    console.log(`   Time: ${end5 - start5}ms`)
    
    // Test 6: Index usage check
    console.log('\n📋 Test 6: Index Usage Check')
    const start6 = Date.now()
    const indexStats = await businesses.aggregate([
      { $indexStats: {} }
    ]).toArray()
    const end6 = Date.now()
    console.log(`   Available indexes: ${indexStats.length}`)
    indexStats.forEach(index => {
      console.log(`   - ${index.name}: ${index.accesses?.ops || 0} operations`)
    })
    console.log(`   Time: ${end6 - start6}ms`)
    
    // Performance summary
    const totalTime = (end1 - start1) + (end2 - start2) + (end3 - start3) + (end4 - start4) + (end5 - start5) + (end6 - start6)
    console.log(`\n📊 Performance Summary:`)
    console.log(`   Total test time: ${totalTime}ms`)
    console.log(`   Average query time: ${Math.round(totalTime / 6)}ms`)
    
    if (totalTime < 1000) {
      console.log('✅ Excellent performance! All queries under 1 second.')
    } else if (totalTime < 3000) {
      console.log('⚠️  Good performance, but could be optimized further.')
    } else {
      console.log('❌ Performance needs improvement. Consider adding more indexes.')
    }
    
  } catch (error) {
    console.error('❌ Performance test error:', error)
  } finally {
    await client.close()
  }
}

performanceTest()
