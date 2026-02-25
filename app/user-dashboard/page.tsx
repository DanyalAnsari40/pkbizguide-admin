"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Calendar, Plus, LogOut } from "lucide-react"
import { AddBusinessForm } from "@/components/add-business-form"
import { useToast } from "@/hooks/use-toast"

interface Business {
  _id: string
  name: string
  businessName?: string
  category: string
  city: string
  status: string
  createdAt: string
  province?: string
  description?: string
}

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("admin-token="))
      ?.split("=")[1]

    if (!token) {
      router.push("/login")
      return
    }

    // Decode token to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('User payload:', payload)
      setUser(payload)
      
      if (payload.role === "admin") {
        router.push("/dashboard")
        return
      }
      
      fetchUserBusinesses(payload.id)
    } catch (error) {
      console.error('Token decode error:', error)
      router.push("/login")
    }
  }, [router])

  const fetchUserBusinesses = async (userId: string) => {
    try {
      console.log('Fetching businesses for user:', userId)
      const token = document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]
      const response = await fetch(`/api/businesses?createdBy=${userId}&history=true`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched businesses:', data.businesses)
        setBusinesses(data.businesses || [])
      } else {
        console.error('Failed to fetch businesses:', response.status)
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Error",
          description: errorData.error || "Failed to fetch your businesses",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch your businesses",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    document.cookie = "admin-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    router.push("/login")
  }

  const handleBusinessAdded = () => {
    setShowAddForm(false)
    if (user) {
      console.log('Refreshing businesses for user:', user.id)
      fetchUserBusinesses(user.id)
    }
    toast({
      title: "Success",
      description: "Business added successfully"
    })
  }

  if (!user) {
    return <div className="min-h-screen bg-muted animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background">
        <div className="flex h-16 items-center px-6 justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">Citation Business</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">Add and manage your business listings</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            {showAddForm ? "Cancel" : "Add Business"}
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Business</CardTitle>
              <CardDescription>Fill in the details to add a new business listing</CardDescription>
            </CardHeader>
            <CardContent>
              <AddBusinessForm onSuccess={handleBusinessAdded} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                My Businesses ({businesses.length})
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => user && fetchUserBusinesses(user.id)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </CardTitle>
            <CardDescription>Your business listings history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No businesses added yet. Click "Add Business" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {businesses.map((business) => (
                  <div key={business._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{business.name || business.businessName}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{business.category}</span>
                          <span>•</span>
                          <span>{business.city}{business.province ? `, ${business.province}` : ''}</span>
                        </div>
                        {business.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{business.description}</p>
                        )}
                      </div>
                      <div className="text-right space-y-2 ml-4">
                        <Badge variant={
                          business.status === "approved" ? "default" : 
                          business.status === "pending" ? "secondary" : "destructive"
                        } className="capitalize">
                          {business.status}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(business.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}