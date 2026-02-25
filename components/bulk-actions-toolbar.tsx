"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { CheckCircle, XCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BulkActionsToolbarProps {
  selectedIds: string[]
  onClearSelection: () => void
  onBulkUpdate: () => void
}

export function BulkActionsToolbar({ selectedIds, onClearSelection, onBulkUpdate }: BulkActionsToolbarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleBulkAction = async (status: string, reason?: string) => {
    setLoading(status)
    try {
      const response = await fetch("/api/businesses/bulk", {
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
        body: JSON.stringify({
          businessIds: selectedIds,
          status,
          rejectionReason: reason,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: `${data.modifiedCount} businesses ${status} successfully`,
        })
        onBulkUpdate()
        onClearSelection()
        if (status === "rejected") {
          setShowRejectDialog(false)
          setRejectionReason("")
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update businesses",
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
      setLoading(null)
    }
  }

  const handleBulkReject = async () => {
    if (!rejectionReason.trim()) return
    await handleBulkAction("rejected", rejectionReason)
  }

  if (selectedIds.length === 0) return null

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedIds.length} selected
          </Badge>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
              onClick={() => handleBulkAction("approved")}
              disabled={loading !== null}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading === "approved" ? "Approving..." : "Approve All"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              onClick={() => setShowRejectDialog(true)}
              disabled={loading !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject All
            </Button>

            <Button size="sm" variant="outline" onClick={onClearSelection}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Businesses</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedIds.length} selected businesses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-reason">Rejection Reason</Label>
              <Textarea
                id="bulk-reason"
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
              onClick={handleBulkReject}
              disabled={!rejectionReason.trim() || loading === "rejected"}
            >
              {loading === "rejected" ? "Rejecting..." : `Reject ${selectedIds.length} Businesses`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
