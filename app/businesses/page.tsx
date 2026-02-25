"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { EnhancedBusinessTable } from "@/components/enhanced-business-table" // Using enhanced table with bulk actions
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, RefreshCw, TrendingUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BusinessTableSkeleton } from "@/components/loading-skeleton"

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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [reviewedFilter, setReviewedFilter] = useState("all")
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const { toast } = useToast()

  const fetchBusinesses = async (useCache = true) => {
    // Check cache first for better performance
    if (useCache) {
      try {
        const cacheKey = `businesses:${pagination.page}:${pageSize}:${statusFilter}:${reviewedFilter}:${search}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          // Use cache if less than 30 seconds old
          if (Date.now() - timestamp < 30000) {
            setBusinesses(data.businesses)
            setPagination(data.pagination)
            setLoading(false)
            return
          }
        }
      } catch {}
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pageSize.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(reviewedFilter !== "all" && { reviewed: reviewedFilter }),
        ...(search && { q: search }),
      })

      const response = await fetch(`/api/businesses?${params}`, {
        cache: "default", // Use default caching instead of no-store
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
        
        // Cache the response
        try {
          const cacheKey = `businesses:${pagination.page}:${pageSize}:${statusFilter}:${reviewedFilter}:${search}`
          sessionStorage.setItem(cacheKey, JSON.stringify({ 
            data, 
            timestamp: Date.now() 
          }))
        } catch {}
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch businesses",
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
        // Optimistic UI update so changes show immediately without a full refresh
        const nowIso = new Date().toISOString()
        setBusinesses((prev) =>
          prev.map((b) =>
            b._id === id
              ? {
                  ...b,
                  status: status as any,
                  rejectionReason: status === "rejected" ? (rejectionReason || b.rejectionReason) : undefined,
                  reviewedAt: nowIso,
                  reviewedBy: b.reviewedBy || "You",
                }
              : b,
          ),
        )
        toast({
          title: "Success",
          description: `Business ${status} successfully`,
        })
        fetchBusinesses() // Refresh the list
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
    fetchBusinesses()
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Hydrate quickly from prefetch cache if available, then fetch fresh
  useEffect(() => {
    try {
      const base = `/api/businesses?page=1&limit=${pagination.limit}`
      const url = statusFilter === 'all' ? base : `${base}&status=${statusFilter}`
      const q = search ? `&q=${encodeURIComponent(search)}` : ''
      const key = `prefetch:${url}${q}`
      const cached = sessionStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.businesses) {
          setBusinesses(parsed.data.businesses)
          setPagination((p) => ({ ...p, total: parsed.data.pagination?.total || p.total, pages: parsed.data.pagination?.pages || p.pages }))
        }
      }
    } catch {}
    fetchBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, reviewedFilter, pageSize])

  const stats = {
    total: pagination.total,
    pending: businesses.filter((b) => b.status === "pending").length,
    approved: businesses.filter((b) => b.status === "approved").length,
    rejected: businesses.filter((b) => b.status === "rejected").length,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            All Business Listings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and review all business submissions with advanced bulk operations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter business listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search businesses, emails, categories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Reviewed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="not-reviewed">Not Reviewed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={fetchBusinesses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Business Table with bulk actions */}
        {loading ? (
          <BusinessTableSkeleton />
        ) : (
          <EnhancedBusinessTable
            businesses={businesses}
            onStatusUpdate={handleStatusUpdate}
            onBulkUpdate={fetchBusinesses}
            loading={false}
            showBulkActions={true}
          />
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} businesses
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Rows per page</p>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={pageSize.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                      disabled={pagination.page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1)
                      }))}
                      disabled={pagination.page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({
                        ...prev,
                        page: Math.min(pagination.pages, prev.page + 1)
                      }))}
                      disabled={pagination.page === pagination.pages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({
                        ...prev,
                        page: pagination.pages
                      }))}
                      disabled={pagination.page === pagination.pages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
