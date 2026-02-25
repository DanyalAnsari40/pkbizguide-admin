"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, Search, Calendar, User, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BusinessHistory {
  _id: string
  name: string
  category: string
  city: string
  status: string
  createdAt: string
  createdBy: string
  createdByName: string
  source: string
}

export default function BusinessHistoryPage() {
  const [businesses, setBusinesses] = useState<BusinessHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [users, setUsers] = useState<{_id: string, name: string}[]>([])
  const { toast } = useToast()

  const fetchBusinessHistory = async () => {
    try {
      const params = new URLSearchParams({
        history: "true",
        ...(search && { q: search }),
        ...(userFilter !== "all" && { createdBy: userFilter })
      })

      const response = await fetch(`/api/businesses?${params}`, {
        headers: {
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch business history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users.filter((user: any) => user.role === 'user')) // Only show regular users in filter
      }
    } catch (error) {
      console.error("Failed to fetch users")
    }
  }

  useEffect(() => {
    fetchBusinessHistory()
    fetchUsers()
  }, [search, userFilter])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <History className="h-8 w-8 text-purple-500" />
              Business History
            </h1>
            <p className="text-muted-foreground">Track which user added which business with date records</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{businesses.length}</div>
                  <div className="text-sm text-blue-600">Total Businesses</div>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {businesses.filter(b => b.status === 'approved').length}
                  </div>
                  <div className="text-sm text-green-600">Approved</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-700">
                    {businesses.filter(b => b.status === 'pending').length}
                  </div>
                  <div className="text-sm text-amber-600">Pending</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <span className="text-white text-sm">⏳</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">{users.length}</div>
                  <div className="text-sm text-purple-600">Active Users</div>
                </div>
                <User className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Business History</CardTitle>
            <CardDescription>Search and filter businesses by user and date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search businesses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({businesses.filter(b => b.createdBy === user._id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            businesses.map((business) => (
              <Card key={business._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg">{business.name}</h3>
                        <Badge variant={business.status === "approved" ? "default" : business.status === "pending" ? "secondary" : "destructive"} className="capitalize">
                          {business.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {business.source}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Category:</span>
                          <span>{business.category}</span>
                          <span className="mx-2">•</span>
                          <span className="font-medium">City:</span>
                          <span>{business.city}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-1 rounded-lg">
                        <User className="h-4 w-4 text-slate-600" />
                        <span className="font-medium text-slate-700">{business.createdByName || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(business.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs">({new Date(business.createdAt).toLocaleTimeString()})</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {businesses.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No business records found</h3>
              <p className="text-sm text-muted-foreground">
                {userFilter !== "all" ? "This user hasn't added any businesses yet" : "No businesses match your search criteria"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}