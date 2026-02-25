"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function AddCategoryModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: () => void }) {
  const { toast } = useToast()
  const [category, setCategory] = useState("")
  const [subCategory, setSubCategory] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const handleSubmit = async () => {
    if (!category.trim()) {
      toast({ title: "Category required", description: "Please enter a category name.", variant: "destructive" })
      return
    }
    if (!imageFile) {
      toast({ title: "Image required", description: "Please select a category image.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const imageDataUrl = await toBase64(imageFile)
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category.trim(), subCategory: subCategory.trim(), imageDataUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || "Could not add category", variant: "destructive" })
        return
      }
      toast({ title: "Category added", description: `${category}${subCategory ? " / " + subCategory : ""} created.` })
      setCategory("")
      setSubCategory("")
      setImageFile(null)
      onCreated?.()
      onOpenChange(false)
    } catch (e) {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Create a category, optional subcategory, and upload an image. This will appear on the home page and in the Add Business form.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1 block">Category Name <span className="text-red-500">*</span></Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Dentist" />
          </div>
          <div>
            <Label className="mb-1 block">Sub Category (optional)</Label>
            <Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g., Pediatric Dentist" />
          </div>
          <div>
            <Label className="mb-1 block">Category Image <span className="text-red-500">*</span></Label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !category.trim() || !imageFile}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
