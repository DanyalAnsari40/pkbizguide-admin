"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { PendingApprovalCard } from "@/components/pending-approval-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Business {
  _id: string
  businessName: string
  email: string
  phone?: string
  website?: string
  address: string
  city: string
  state: string
  zipCode: string
  category: string
  description?: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  updatedAt?: string
  reviewedBy?: string
  rejectionReason?: string
}

interface BusinessesResponse {
  businesses: Business[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function PendingApprovalsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const { toast } = useToast()

  const fetchPendingBusinesses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: "pending",
        ...(search && { q: search }),
      })

      const response = await fetch(`/api/businesses?${params}` + `&t=${Date.now()}` , {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("admin-token="))
              ?.split("=")[1]
          }`,
        },
      })

      if (response.ok) {
        const data: BusinessesResponse = await response.json()
        setBusinesses(data.businesses)
        setPagination(data.pagination)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch pending businesses",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("admin-token="))
              ?.split("=")[1]
          }`,
        },
        body: JSON.stringify({ status, rejectionReason }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Business ${status} successfully`,
        })
        // Remove the business from the list since it's no longer pending
        setBusinesses((prev) => prev.filter((b) => b._id !== id))
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      } else {
        toast({
          title: "Error",
          description: "Failed to update business status",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchPendingBusinesses()
  }

  const handleBulkApprove = async () => {
    if (businesses.length === 0) return

    const confirmBulk = window.confirm(`Are you sure you want to approve all ${businesses.length} pending businesses?`)
    if (!confirmBulk) return

    try {
      const promises = businesses.map((business) =>
        fetch(`/api/businesses/${business._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              document.cookie
                .split("; ")
                .find((row) => row.startsWith("admin-token="))
                ?.split("=")[1]
            }`,
          },
          body: JSON.stringify({ status: "approved" }),
        }),
      )

      await Promise.all(promises)
      toast({
        title: "Success",
        description: `All ${businesses.length} businesses approved successfully`,
      })
      setBusinesses([])
      setPagination((prev) => ({ ...prev, total: 0 }))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve all businesses",
        variant: "destructive",
      })
    }
  }

  // Hydrate quickly from prefetch cache if available, then fetch fresh
  useEffect(() => {
    try {
      const url = `/api/businesses?page=1&limit=${pagination.limit}&status=pending`
      const key = `prefetch:${url}`
      const cached = sessionStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.businesses) {
          setBusinesses(parsed.data.businesses)
          setPagination((p) => ({ ...p, total: parsed.data.pagination?.total || p.total, pages: parsed.data.pagination?.pages || p.pages }))
        }
      }
    } catch {}
    fetchPendingBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-500" />
              Pending Approvals
            </h1>
            <p className="text-sm text-muted-foreground">Review and approve new business submissions</p>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-sm px-3 py-1.5">
            {pagination.total} Pending
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Search pending submissions and bulk actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search pending businesses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={fetchPendingBusinesses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {businesses.length > 0 && (
                <Button
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
                  onClick={handleBulkApprove}
                >
                  Approve All ({businesses.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Businesses */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded w-20" />
                      <div className="h-8 bg-muted rounded w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <AlertCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Pending Approvals</h3>
                  <p className="text-muted-foreground">All business submissions have been reviewed!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {businesses.map((business) => (
                <PendingApprovalCard key={business._id} business={business} onStatusUpdate={handleStatusUpdate} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} pending
                      businesses
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
