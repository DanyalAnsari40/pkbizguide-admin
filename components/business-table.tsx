"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { CheckCircle, XCircle, Clock, Eye, MapPin, Mail, Phone, Globe } from "lucide-react"

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
  rejectionReason?: string
}

interface BusinessTableProps {
  businesses: Business[]
  onStatusUpdate: (id: string, status: string, rejectionReason?: string) => Promise<void>
  loading?: boolean
  showRejectionReason?: boolean
}

export function BusinessTable({ businesses, onStatusUpdate, loading, showRejectionReason = false }: BusinessTableProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
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
          <CardDescription>Manage and review business submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  {showRejectionReason && <TableHead>Reason</TableHead>}
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showRejectionReason ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((business) => (
                    <TableRow key={business._id}>
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
                        <div className="text-sm flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5" />
                          <span>
                            {business.address ? `${business.address}, ` : ""}
                            {business.city}, {business.state} {business.zipCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(business.status)}</TableCell>
                      {showRejectionReason && (
                        <TableCell className="max-w-[280px] truncate" title={business.rejectionReason || "-"}>
                          {business.rejectionReason || "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(business.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedBusiness(business)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
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

      {/* Business Details Dialog */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBusiness?.businessName || (selectedBusiness as any)?.name}</DialogTitle>
            <DialogDescription>Business listing details</DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4">
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

              <div>
                <Label className="text-sm font-medium">Contact Information</Label>
                <div className="mt-1 space-y-1">
                  <p className="text-sm">{selectedBusiness.email}</p>
                  {selectedBusiness.phone && <p className="text-sm">{selectedBusiness.phone}</p>}
                  {selectedBusiness.website && (
                    <a
                      href={selectedBusiness.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedBusiness.website}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="mt-1">
                  {selectedBusiness.address}, {selectedBusiness.city}, {selectedBusiness.state}{" "}
                  {selectedBusiness.zipCode}
                </p>
              </div>

              {selectedBusiness.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="mt-1 text-sm">{selectedBusiness.description}</p>
                </div>
              )}

              {selectedBusiness.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium">Rejection Reason</Label>
                  <p className="mt-1 text-sm text-red-600">{selectedBusiness.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label className="text-sm font-medium">Submitted</Label>
                  <p className="mt-1">{new Date(selectedBusiness.createdAt).toLocaleString()}</p>
                </div>
                {selectedBusiness.reviewedBy && (
                  <div>
                    <Label className="text-sm font-medium">Reviewed By</Label>
                    <p className="mt-1">{selectedBusiness.reviewedBy}</p>
                  </div>
                )}
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
    </>
  )
}
