"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CheckCircle, XCircle, MapPin, Mail, Phone, Globe, Calendar, Eye } from "lucide-react"

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
  logoUrl?: string
  logoDataUrl?: string
  logoPublicId?: string
}

interface PendingApprovalCardProps {
  business: Business
  onStatusUpdate: (id: string, status: string, rejectionReason?: string) => Promise<void>
}

export function PendingApprovalCard({ business, onStatusUpdate }: PendingApprovalCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  const handleApprove = async () => {
    setUpdating("approve")
    try {
      await onStatusUpdate(business._id, "approved")
    } finally {
      setUpdating(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) return

    setUpdating("reject")
    try {
      await onStatusUpdate(business._id, "rejected", rejectionReason)
      setShowRejectDialog(false)
      setRejectionReason("")
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 flex items-start gap-3">
              <img
                src={(business as any).logoUrl || (business as any).logoDataUrl || "/placeholder-logo.png"}
                alt={business.businessName || (business as any).name}
                className="h-10 w-10 rounded object-cover border"
              />
              <div>
                <CardTitle className="text-lg">{business.businessName || (business as any).name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Submitted {formatDate(business.createdAt)}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
              {business.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{business.email}</span>
            </div>
            {business.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{business.phone}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {business.website}
                </a>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>
              {business.city}, {business.state} {business.zipCode}
            </span>
          </div>

          {/* Description Preview */}
          {business.description && (
            <div className="text-sm text-muted-foreground">
              <p className="line-clamp-2">{business.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent flex-1"
              onClick={handleApprove}
              disabled={updating !== null}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updating === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent flex-1"
              onClick={() => setShowRejectDialog(true)}
              disabled={updating !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{business.businessName || (business as any).name}</DialogTitle>
            <DialogDescription>Complete business submission details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <p className="mt-1">{business.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Submitted</Label>
                <p className="mt-1">{formatDate(business.createdAt)}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Contact Information</Label>
              <div className="mt-1 space-y-1">
                <p className="text-sm">{business.email}</p>
                {business.phone && <p className="text-sm">{business.phone}</p>}
                {business.website && (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    {business.website}
                  </a>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Full Address</Label>
              <p className="mt-1">
                {business.address}, {business.city}, {business.state} {business.zipCode}
              </p>
            </div>

            {business.description && (
              <div>
                <Label className="text-sm font-medium">Business Description</Label>
                <p className="mt-1 text-sm">{business.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
              onClick={() => {
                setShowDetails(false)
                handleApprove()
              }}
              disabled={updating !== null}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updating === "approve" ? "Approving..." : "Approve Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business Listing</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting "{business.businessName || (business as any).name}"</DialogDescription>
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
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || updating === "reject"}
            >
              {updating === "reject" ? "Rejecting..." : "Reject Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
