"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MessageSquare } from "lucide-react"

interface Review {
  _id: string
  businessId: string
  name?: string
  rating: number
  comment?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

interface ReviewsResponse {
  ok: boolean
  data: {
    reviews: Review[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
  error?: string
}

function getAdminToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie.split("; ").find(r => r.startsWith("admin-token="))?.split("=")[1]
}

export default function BusinessReviewsPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const businessId = params?.id || ""

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Review | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; rating: number; comment: string; status: string }>({ name: "", rating: 5, comment: "", status: "visible" })
  const [saving, setSaving] = useState(false)

  const fetchReviews = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId, page: String(pagination.page), limit: String(pageSize) })
      if (search.trim()) params.set("q", search.trim())
      const res = await fetch(`/api/reviews?${params.toString()}&t=${Date.now()}`, {
        cache: "no-store",
        headers: (() => {
          const token = getAdminToken()
          return token ? { Authorization: `Bearer ${token}` } : undefined
        })()
      })
      const json: ReviewsResponse = await res.json().catch(() => ({ ok: false })) as any
      if (json?.ok) {
        setReviews(json.data.reviews)
        setPagination(p => ({ ...p, total: json.data.pagination.total, pages: json.data.pagination.pages, limit: json.data.pagination.limit }))
      } else {
        console.error("Failed to fetch reviews", res.status, json?.error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, pagination.page, pageSize])

  const openEdit = (r: Review) => {
    setEditing(r)
    setEditForm({ name: r.name || "", rating: r.rating || 5, comment: r.comment || "", status: r.status || "visible" })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: editForm.name, rating: Number(editForm.rating), comment: editForm.comment, status: editForm.status }),
      })
      if (res.ok) {
        const json = await res.json().catch(() => null)
        const updated: Review | null = json?.review ?? null
        if (updated) {
          setReviews(prev => prev.map(r => (r._id === updated._id ? { ...r, ...updated } : r)))
        } else {
          await fetchReviews()
        }
        setEditOpen(false)
        setEditing(null)
      } else {
        let msg = `Failed to update review (status ${res.status})`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {}
        console.error("Update error:", res.status, res.statusText)
        if (typeof window !== 'undefined') window.alert(msg)
      }
    } catch (e) {
      console.error(e)
      if (typeof window !== 'undefined') window.alert("Error while updating")
    } finally {
      setSaving(false)
    }
  }

  const deleteReview = async (id: string) => {
    const ok = typeof window !== 'undefined' ? window.confirm("Delete this review? This cannot be undone.") : false
    if (!ok) return
    try {
      const token = getAdminToken()
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (res.ok) {
        setReviews(prev => prev.filter(r => r._id !== id))
        setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }))
      } else {
        let msg = `Failed to delete review (status ${res.status})`
        try { const j = await res.json(); if (j?.error) msg = j.error } catch {}
        console.error("Delete error:", res.status, res.statusText)
        if (typeof window !== 'undefined') window.alert(msg)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Reviews
          </h1>
          <p className="text-sm text-muted-foreground">Manage reviews for this business</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and paginate reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-center">
              <Input placeholder="Search (coming soon)" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Button onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchReviews() }}>Search</Button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPagination(p => ({ ...p, page: 1 })) }}>
                  <SelectTrigger className="h-8 w-[80px]"><SelectValue placeholder={String(pageSize)} /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : reviews.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No reviews found</TableCell></TableRow>
                  ) : (
                    reviews.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">{r.name || '-'}</TableCell>
                        <TableCell>{r.rating} / 5</TableCell>
                        <TableCell className="max-w-[400px] truncate" title={r.comment}>{r.comment}</TableCell>
                        <TableCell className="capitalize">{r.status || 'visible'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteReview(r._id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reviews
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: 1 }))}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: pagination.pages }))}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(v) => { if (!v) { setEditOpen(false); setEditing(null) } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>Update the name, rating, comment, and status.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Name</Label>
                <Input className="mt-1" value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Rating</Label>
                <Select value={String(editForm.rating)} onValueChange={(v) => setEditForm(p => ({ ...p, rating: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Comment</Label>
                <Textarea className="mt-1" value={editForm.comment} onChange={(e) => setEditForm(p => ({ ...p, comment: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['visible','hidden','flagged'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
