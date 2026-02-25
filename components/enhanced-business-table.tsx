"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CheckCircle, XCircle, Clock, Eye, MapPin, Mail, Phone, Globe, History, Trash2, MessageSquare, ChevronsUpDown, Star } from "lucide-react"
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar"

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
  featured?: boolean
  featuredAt?: string
  createdAt: string
  updatedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  logoUrl?: string
  logoDataUrl?: string
  logoPublicId?: string
}

interface EnhancedBusinessTableProps {
  businesses: Business[]
  onStatusUpdate: (id: string, status: string, rejectionReason?: string) => Promise<void>
  onBulkUpdate: () => void
  loading?: boolean
  showBulkActions?: boolean
}

export function EnhancedBusinessTable({
  businesses,
  onStatusUpdate,
  onBulkUpdate,
  loading,
  showBulkActions = true,
}: EnhancedBusinessTableProps) {
  const router = useRouter()
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    business: Business | null
    action: "approve" | "reject" | null
  }>({
    open: false,
    business: null,
    action: null,
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{ open: boolean; business: Business | null }>(() => ({ open: false, business: null }))
  const [editForm, setEditForm] = useState<any>({})
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Category and subcategory state for edit dialog
  const [categories, setCategories] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const [subCatOpen, setSubCatOpen] = useState(false)
  const [catQuery, setCatQuery] = useState("")
  const [subCatQuery, setSubCatQuery] = useState("")
  
  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.toLowerCase().includes(q))
  }, [catQuery, categories])
  
  const filteredSubcategories = useMemo(() => {
    const q = subCatQuery.trim().toLowerCase()
    if (!q) return subcategories
    return subcategories.filter((s) => s.toLowerCase().includes(q))
  }, [subCatQuery, subcategories])

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const list: string[] = Array.isArray(data?.categories)
        ? data.categories.map((c: any) => c?.name || c?.slug).filter(Boolean)
        : []
      setCategories(list)
    } catch {
      setCategories([])
    }
  }
  
  const fetchSubcategories = async (categoryName?: string) => {
    const cat = categoryName || editForm.category?.trim()
    if (!cat) {
      setSubcategories([])
      return
    }
    try {
      const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(toSlug(cat))}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const list: string[] = Array.isArray(data?.category?.subcategories)
        ? data.category.subcategories.map((s: any) => s?.name || s?.slug).filter(Boolean)
        : []
      setSubcategories(list)
    } catch (e) {
      setSubcategories([])
    }
  }
  
  useEffect(() => {
    if (editDialog.open) {
      fetchCategories()
    }
  }, [editDialog.open])
  
  useEffect(() => {
    if (editForm.category) {
      fetchSubcategories()
    }
  }, [editForm.category])

  const openEdit = (b: Business) => {
    setEditDialog({ open: true, business: b })
    setEditForm({
      businessName: b.businessName || (b as any).name || "",
      contactPersonName: (b as any).contactPersonName || (b as any).contactPerson || "",
      category: b.category || "",
      subCategory: (b as any).subCategory || "",
      province: (b as any).province || "",
      city: b.city || "",
      postalCode: (b as any).postalCode || (b as any).zipCode || "",
      address: b.address || "",
      phone: b.phone || "",
      whatsapp: (b as any).whatsapp || "",
      email: b.email || "",
      websiteUrl: (b as any).websiteUrl || (b as any).website || "",
      facebookUrl: (b as any).facebookUrl || "",
      gmbUrl: (b as any).gmbUrl || "",
      youtubeUrl: (b as any).youtubeUrl || "",
      description: b.description || "",
      swiftCode: (b as any).swiftCode || "",
      branchCode: (b as any).branchCode || "",
      cityDialingCode: (b as any).cityDialingCode || "",
      iban: (b as any).iban || "",
    })
    setEditLogoFile(null)
  }

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })

  const saveEdit = async () => {
    if (!editDialog.business) return
    setSavingEdit(true)
    try {
      const token = typeof document !== 'undefined'
        ? document.cookie.split("; ").find((row) => row.startsWith("admin-token="))?.split("=")[1]
        : undefined

      // Prefer multipart: send fields + optional logoFile for reliable Cloudinary upload on Vercel
      const fd = new FormData()
      fd.set('action', 'updateFields')
      Object.entries(editForm || {}).forEach(([k, v]) => fd.set(k, String(v ?? '')))
      if (editLogoFile) fd.set('logoFile', editLogoFile)

      const res = await fetch(`/api/businesses/${editDialog.business._id}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      })
      if (res.ok) {
        setEditDialog({ open: false, business: null })
        setEditForm({})
        setEditLogoFile(null)
        onBulkUpdate()
      } else {
        console.error('Failed to update business fields')
        if (typeof window !== 'undefined') window.alert('Failed to update business. Please try again.')
      }
    } catch (e) {
      console.error(e)
      if (typeof window !== 'undefined') window.alert('Error while updating. Please try again.')
    } finally {
      setSavingEdit(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(businesses.map((b) => b._id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectBusiness = (businessId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, businessId])
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== businessId))
    }
  }

  const handleAction = async (business: Business, action: "approve" | "reject") => {
    if (action === "reject") {
      setActionDialog({ open: true, business, action })
      return
    }

    setUpdating(business._id)
    try {
      await onStatusUpdate(business._id, "approved")
    } finally {
      setUpdating(null)
    }
  }

  const handleReject = async () => {
    if (!actionDialog.business) return

    setUpdating(actionDialog.business._id)
    try {
      await onStatusUpdate(actionDialog.business._id, "rejected", rejectionReason)
      setActionDialog({ open: false, business: null, action: null })
      setRejectionReason("")
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (business: Business) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete "${business.businessName || (business as any).name}"? This cannot be undone.`) : false
    if (!confirmed) return

    setUpdating(business._id)
    try {
      const token = typeof document !== 'undefined'
        ? document.cookie.split("; ").find((row) => row.startsWith("admin-token="))?.split("=")[1]
        : undefined
      const res = await fetch(`/api/businesses/${business._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (res.ok) {
        onBulkUpdate()
      } else {
        console.error('Failed to delete business')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  const handleFeaturedToggle = async (business: Business) => {
    setUpdating(business._id)
    
    // Optimistic update - update UI immediately
    const newFeaturedStatus = !business.featured
    const optimisticBusiness = {
      ...business,
      featured: newFeaturedStatus,
      featuredAt: newFeaturedStatus ? new Date().toISOString() : undefined
    }
    
    // Update the business in the list immediately
    onBulkUpdate() // This will trigger a refresh, but the optimistic update makes it feel faster
    
    try {
      const token = typeof document !== 'undefined'
        ? document.cookie.split("; ").find((row) => row.startsWith("admin-token="))?.split("=")[1]
        : undefined
      
      const res = await fetch(`/api/businesses/${business._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          featured: newFeaturedStatus,
          featuredAt: newFeaturedStatus ? new Date().toISOString() : null
        }),
      })
      
      if (!res.ok) {
        console.error('Failed to toggle featured status')
        // Revert optimistic update on failure
        onBulkUpdate()
      }
    } catch (e) {
      console.error(e)
      // Revert optimistic update on error
      onBulkUpdate()
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Listings</CardTitle>
          <CardDescription>Manage and review business submissions with bulk actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {showBulkActions && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === businesses.length && businesses.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showBulkActions ? 10 : 9} className="text-center py-8 text-muted-foreground">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((business) => (
                    <TableRow key={business._id}>
                      {showBulkActions && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(business._id)}
                            onCheckedChange={(checked) => handleSelectBusiness(business._id, checked as boolean)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={(business as any).logoUrl || (business as any).logoDataUrl || "/placeholder-logo.png"}
                            alt={business.businessName || (business as any).name}
                            className="h-8 w-8 rounded object-cover border"
                          />
                          <div>
                            <div className="font-medium">{business.businessName || (business as any).name}</div>
                            {business.website && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <a
                                  href={business.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {business.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {business.email}
                          </div>
                          {business.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {business.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {business.city}, {business.state}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(business.status)}</TableCell>
                      <TableCell>
                        {business.featured ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(business.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {business.reviewedBy ? (
                          <div>
                            <div>{business.reviewedBy}</div>
                            {business.reviewedAt && (
                              <div className="text-xs">{new Date(business.reviewedAt).toLocaleDateString()}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(business)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedBusiness(business)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/businesses/${business._id}/reviews`)}>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Reviews
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`${business.featured ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100' : 'hover:bg-yellow-50'}`}
                            onClick={() => handleFeaturedToggle(business)}
                            disabled={updating === business._id}
                          >
                            <Star className={`w-3 h-3 mr-1 ${business.featured ? 'fill-current' : ''}`} />
                            {business.featured ? 'Featured' : 'Feature'}
                          </Button>
                          {business.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
                                onClick={() => handleAction(business, "approve")}
                                disabled={updating === business._id}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {updating === business._id ? "..." : "Approve"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                                onClick={() => handleAction(business, "reject")}
                                disabled={updating === business._id}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(business)}
                            disabled={updating === business._id}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {updating === business._id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <BulkActionsToolbar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
          onBulkUpdate={onBulkUpdate}
        />
      )}

      {/* Business Details Dialog */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBusiness?.businessName || (selectedBusiness as any)?.name}
              <History className="w-4 h-4" />
            </DialogTitle>
            <DialogDescription>Complete business listing details and audit trail</DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedBusiness.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="mt-1">{selectedBusiness.category}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Audit Trail</Label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Submitted:</span>
                    <span>{new Date(selectedBusiness.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedBusiness.reviewedBy && (
                    <>
                      <div className="flex justify-between">
                        <span>Reviewed by:</span>
                        <span>{selectedBusiness.reviewedBy}</span>
                      </div>
                      {selectedBusiness.reviewedAt && (
                        <div className="flex justify-between">
                          <span>Reviewed at:</span>
                          <span>{new Date(selectedBusiness.reviewedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedBusiness.updatedAt && (
                    <div className="flex justify-between">
                      <span>Last updated:</span>
                      <span>{new Date(selectedBusiness.updatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={() => setActionDialog({ open: false, business: null, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business Listing</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{actionDialog.business?.businessName || (actionDialog.business as any)?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, business: null, action: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || updating === actionDialog.business?._id}
            >
              {updating === actionDialog.business?._id ? "Rejecting..." : "Reject Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Business Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(v) => { if (!v) { setEditDialog({ open: false, business: null }); setEditLogoFile(null) } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update the business details and logo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label className="text-sm">Business Name</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.businessName || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, businessName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Contact Person</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.contactPersonName || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, contactPersonName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Category</Label>
              <Popover open={catOpen} onOpenChange={setCatOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={catOpen} className="w-full justify-between h-9 mt-1">
                    <span className="truncate">{editForm.category || "Select category"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search category..." value={catQuery} onValueChange={setCatQuery} className="h-9" />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {filteredCategories.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={(val) => {
                              setEditForm((p: any) => ({ ...p, category: val, subCategory: "" }))
                              fetchSubcategories(val)
                              setCatOpen(false)
                              setCatQuery("")
                            }}
                          >
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm">Sub Category</Label>
              <Popover open={subCatOpen} onOpenChange={setSubCatOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={subCatOpen} className="w-full justify-between h-9 mt-1">
                    <span className="truncate">{editForm.subCategory || "Select subcategory"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search subcategory..." value={subCatQuery} onValueChange={setSubCatQuery} className="h-9" />
                    <CommandList>
                      <CommandEmpty>No subcategory found.</CommandEmpty>
                      <CommandGroup>
                        {filteredSubcategories.map((s) => (
                          <CommandItem
                            key={s}
                            value={s}
                            onSelect={(val) => {
                              setEditForm((p: any) => ({ ...p, subCategory: val }))
                              setSubCatOpen(false)
                              setSubCatQuery("")
                            }}
                          >
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm">Province</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.province || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, province: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.city || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Postal Code</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.postalCode || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, postalCode: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.address || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Phone</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.phone || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">WhatsApp</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.whatsapp || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, whatsapp: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.email || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">Website</Label>
              <input className="mt-1 w-full border rounded px-3 h-9" value={editForm.websiteUrl || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, websiteUrl: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">Description</Label>
              <textarea className="mt-1 w-full border rounded px-3 py-2" rows={4} value={editForm.description || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">Logo</Label>
              <input type="file" accept="image/*" className="mt-1 w-full" onChange={(e) => setEditLogoFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, business: null })}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
