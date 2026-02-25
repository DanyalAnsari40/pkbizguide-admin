"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Clock, CheckCircle, XCircle, Users, Star } from "lucide-react"
import { DashboardSkeleton } from "@/components/loading-skeleton"

type ActivityItem = {
  type: "submitted" | "approved" | "rejected"
  title: string
  subtitle?: string
  at: string
}

type TopUser = {
  _id: string
  name: string
  email: string
  businessCount: number
  approvedCount: number
  pendingCount: number
}

type FeaturedBusiness = {
  id: string
  name?: string
  businessName?: string
  category: string
  city: string
  logoUrl?: string
  logoDataUrl?: string
  featured: boolean
  featuredAt?: string
  createdAt: string
  slug: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async (useCache = true) => {
    // Check cache first for better performance
    if (useCache) {
      try {
        const analyticsCache = sessionStorage.getItem('dashboard:analytics')
        const featuredCache = sessionStorage.getItem('dashboard:featured')
        
        if (analyticsCache) {
          const { data, timestamp } = JSON.parse(analyticsCache)
          if (Date.now() - timestamp < 60000) { // 1 minute cache
            setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 })
            setActivities(data.activities || [])
            setTopUsers(data.topUsers || [])
          }
        }
        
        if (featuredCache) {
          const { data, timestamp } = JSON.parse(featuredCache)
          if (Date.now() - timestamp < 30000) { // 30 seconds cache for featured
            setFeaturedBusinesses(data.featuredBusinesses || [])
            setLoading(false)
            return
          }
        }
      } catch {}
    }

    try {
      const [analyticsRes, featuredRes] = await Promise.all([
        fetch('/api/analytics', { 
          cache: "default", // Use default caching
          headers: { 'Cache-Control': 'max-age=60' } // 1 minute cache
        }),
        fetch('/api/featured-businesses', { 
          cache: "default",
          headers: { 'Cache-Control': 'max-age=30' } // 30 seconds cache
        })
      ])
      
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        if (analyticsData?.stats) setStats(analyticsData.stats)
        if (Array.isArray(analyticsData?.activities)) setActivities(analyticsData.activities)
        if (Array.isArray(analyticsData?.topUsers)) setTopUsers(analyticsData.topUsers)
        
        // Cache analytics data
        try {
          sessionStorage.setItem('dashboard:analytics', JSON.stringify({
            data: analyticsData,
            timestamp: Date.now()
          }))
        } catch {}
      }
      
      if (featuredRes.ok) {
        const featuredData = await featuredRes.json()
        if (Array.isArray(featuredData?.featuredBusinesses)) setFeaturedBusinesses(featuredData.featuredBusinesses)
        
        // Cache featured data
        try {
          sessionStorage.setItem('dashboard:featured', JSON.stringify({
            data: featuredData,
            timestamp: Date.now()
          }))
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-slate-600 mt-2">Overview of business listings and approval status</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Listings</CardTitle>
              <div className="p-2 bg-blue-500 rounded-xl">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">{loading ? '—' : stats.total}</div>
              <p className="text-xs text-blue-600">All business submissions</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Pending Review</CardTitle>
              <div className="p-2 bg-orange-500 rounded-xl">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800">{loading ? '—' : stats.pending}</div>
              <p className="text-xs text-orange-600">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
              <div className="p-2 bg-green-500 rounded-xl">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">{loading ? '—' : stats.approved}</div>
              <p className="text-xs text-green-600">Live on website</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle>
              <div className="p-2 bg-red-500 rounded-xl">
                <XCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-800">{loading ? '—' : stats.rejected}</div>
              <p className="text-xs text-red-600">Not approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Businesses Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Featured Businesses
            </CardTitle>
            <CardDescription className="text-slate-600">Businesses marked as featured for special promotion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading featured businesses...</p>
              ) : featuredBusinesses.length === 0 ? (
                <div className="p-4 border rounded-lg bg-white/50 text-center">
                  <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No featured businesses yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Mark businesses as featured to see them here</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredBusinesses.map((business) => (
                    <div key={business.id} className="p-4 border rounded-lg bg-white/70 hover:bg-white/90 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={business.logoUrl || business.logoDataUrl || "/placeholder-logo.png"}
                          alt={business.businessName || business.name}
                          className="h-10 w-10 rounded object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {business.businessName || business.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">{business.category}</p>
                        </div>
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>{business.city}</p>
                        {business.featuredAt && (
                          <p>Featured: {new Date(business.featuredAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-slate-800">Recent Activity</CardTitle>
              <CardDescription className="text-slate-600">Latest business listing submissions and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  activities.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${a.type === "approved" ? "bg-green-500" : a.type === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="flex-1">
                        <p className="font-medium">
                          {a.type === "approved" ? "Business approved" : a.type === "rejected" ? "Business rejected" : "New business submission"}
                        </p>
                        {a.subtitle ? (
                          <p className="text-sm text-muted-foreground">{a.subtitle}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">{`"${a.title}"`}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-slate-800">Top Contributors</CardTitle>
              <CardDescription className="text-slate-600">Users who have added the most businesses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : topUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No user data available.</p>
                ) : (
                  topUsers.map((user, idx) => (
                    <div key={user._id} className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-r from-slate-50 to-slate-100">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-800">{user.businessCount}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.approvedCount} approved • {user.pendingCount} pending
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
