const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

async function createAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('BizBranches')
    const users = db.collection('users')
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ email: 'admin@citation.com' })
    if (existingAdmin) {
      console.log('Admin user already exists')
      return
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await users.insertOne({
      name: 'Administrator',
      email: 'admin@citation.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    })
    
    console.log('Admin user created successfully!')
    console.log('Email: admin@citation.com')
    console.log('Password: admin123')
    
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await client.close()
  }
}

createAdmin()