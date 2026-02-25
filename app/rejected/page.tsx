"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { BusinessTable } from "@/components/business-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Business {
  _id: string
  businessName: string
  name?: string
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

export default function RejectedListingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const { toast } = useToast()

  const fetchRejectedBusinesses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: "rejected",
        ...(search && { q: search }),
      })

      const response = await fetch(`/api/businesses?${params}` + `&t=${Date.now()}`, {
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
          description: "Failed to fetch rejected businesses",
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
        fetchRejectedBusinesses() // Refresh the list
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
    fetchRejectedBusinesses()
  }

  // Hydrate quickly from prefetch cache if available, then fetch fresh
  useEffect(() => {
    try {
      const url = `/api/businesses?page=1&limit=${pagination.limit}&status=rejected`
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
    fetchRejectedBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              Rejected Listings
            </h1>
            <p className="text-muted-foreground">Review rejected businesses and their reasons</p>
          </div>
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 text-lg px-4 py-2">
            {pagination.total} Rejected
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Rejected Listings</CardTitle>
            <CardDescription>Find and review rejected business listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search rejected businesses..."
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
              <Button variant="outline" onClick={fetchRejectedBusinesses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rejected Businesses Table */}
        <BusinessTable businesses={businesses} onStatusUpdate={handleStatusUpdate} loading={loading} showRejectionReason />
      </div>
    </AdminLayout>
  )
}
