"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit3, Image as ImageIcon, Plus, RefreshCw } from "lucide-react"
import { AddCategoryModal } from "@/components/add-category-modal"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface Subcategory {
  slug: string
  name: string
  count?: number
}

interface CategoryItem {
  slug: string
  name: string
  count?: number
  imageUrl?: string
  subcategories?: Subcategory[]
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [editing, setEditing] = useState<{ slug: string; name: string } | null>(null)
  const [addingSub, setAddingSub] = useState<{ slug: string; subName: string } | null>(null)
  const [uploadingImageSlug, setUploadingImageSlug] = useState<string | null>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/categories", { cache: "no-store" })
      const data = await res.json()
      const list: CategoryItem[] = Array.isArray(data?.categories) ? data.categories : []
      // For each, also include subcategories via slug fetch (in parallel)
      const withSubs = await Promise.all(
        list.map(async (c) => {
          try {
            const r = await fetch(`/api/categories?slug=${encodeURIComponent(c.slug)}`, { cache: "no-store" })
            const d = await r.json()
            return { ...c, subcategories: d?.category?.subcategories || [] }
          } catch {
            return { ...c, subcategories: [] }
          }
        })
      )
      setCategories(withSubs)
      // announce changes (for other tabs/components to refresh)
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch (e) {
      toast({ title: "Error", description: "Failed to load categories", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // UI-only auto-refresh: listen for cross-tab updates and refocus
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "categories:version") {
        fetchAll()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAll()
      }
    }
    try {
      window.addEventListener("storage", onStorage)
    } catch {}
    try {
      document.addEventListener("visibilitychange", onVisibility)
    } catch {}
    return () => {
      try { window.removeEventListener("storage", onStorage) } catch {}
      try { document.removeEventListener("visibilitychange", onVisibility) } catch {}
    }
  }, [])

  const updateName = async (slug: string, newName: string) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateCategoryName", slug, newName }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Updated", description: "Category name updated" })
      await fetchAll()
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to update name", variant: "destructive" })
    }
  }

  const updateImage = async (slug: string, file: File) => {
    try {
      setUploadingImageSlug(slug)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateCategoryImage", slug, imageDataUrl: dataUrl }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Updated", description: "Image updated" })
      await fetchAll()
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to update image", variant: "destructive" })
    } finally {
      setUploadingImageSlug(null)
    }
  }

  const addSubcategory = async (slug: string, name: string) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addSubcategory", slug, subName: name }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Added", description: "Subcategory added" })
      // Update only this category instantly without full refetch
      try {
        const r = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        const d = await r.json()
        const subs = d?.category?.subcategories || []
        setCategories((prev) => prev.map((c) => (c.slug === slug ? { ...c, subcategories: subs } : c)))
      } catch {
        // fallback to full refresh
        await fetchAll()
      }
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to add subcategory", variant: "destructive" })
    }
  }

  const renameSubcategory = async (slug: string, subSlug: string, newName: string) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renameSubcategory", slug, subSlug, newName }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Updated", description: "Subcategory updated" })
      // Update only this category instantly without full refetch
      try {
        const r = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        const d = await r.json()
        const subs = d?.category?.subcategories || []
        setCategories((prev) => prev.map((c) => (c.slug === slug ? { ...c, subcategories: subs } : c)))
      } catch {
        await fetchAll()
      }
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to update subcategory", variant: "destructive" })
    }
  }

  const deleteCategory = async (slug: string) => {
    try {
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Deleted", description: "Category deleted" })
      await fetchAll()
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" })
    }
  }

  const deleteSubcategory = async (slug: string, subSlug: string) => {
    try {
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}&subSlug=${encodeURIComponent(subSlug)}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Deleted", description: "Subcategory deleted" })
      // Update only this category instantly without full refetch
      try {
        const r = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        const d = await r.json()
        const subs = d?.category?.subcategories || []
        setCategories((prev) => prev.map((c) => (c.slug === slug ? { ...c, subcategories: subs } : c)))
      } catch {
        await fetchAll()
      }
      try { localStorage.setItem("categories:version", String(Date.now())) } catch {}
    } catch {
      toast({ title: "Error", description: "Failed to delete subcategory", variant: "destructive" })
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCatModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* FAQ-style accordion list */}
      <Accordion type="single" collapsible className="w-full space-y-4">
        {categories.map((cat) => (
          <Card key={cat.slug}>
            <AccordionItem value={cat.slug}>
              <CardHeader className="p-0">
                <AccordionTrigger className="px-4">
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={cat.imageUrl || "/placeholder.jpg"} alt={cat.name} className="w-12 h-12 rounded object-cover border" />
                      <div>
                        <div className="font-semibold">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">{cat.slug}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setEditing({ slug: cat.slug, name: cat.name }) }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <label className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) updateImage(cat.slug, f)
                          }}
                          className="hidden"
                        />
                        <Button asChild variant="outline" size="sm" disabled={uploadingImageSlug === cat.slug}>
                          <span className="inline-flex items-center">
                            <ImageIcon className="h-4 w-4 mr-1" /> {uploadingImageSlug === cat.slug ? "Uploading..." : "Image"}
                          </span>
                        </Button>
                      </label>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the category "{cat.name}" and all its subcategories. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategory(cat.slug)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4 pt-4">
                  {editing?.slug === cat.slug && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor="newName">Rename category</Label>
                        <Input id="newName" value={editing.name} onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))} />
                      </div>
                      <Button onClick={() => { updateName(cat.slug, editing.name); setEditing(null) }}>Save</Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Subcategories</div>
                      {addingSub?.slug === cat.slug ? (
                        <div className="flex gap-2 items-end">
                          <Input placeholder="New subcategory" value={addingSub.subName} onChange={(e) => setAddingSub({ slug: cat.slug, subName: e.target.value })} />
                          <Button onClick={() => { if (addingSub.subName.trim()) addSubcategory(cat.slug, addingSub.subName.trim()); setAddingSub(null) }}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                          <Button variant="ghost" onClick={() => setAddingSub(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setAddingSub({ slug: cat.slug, subName: "" })}>
                          <Plus className="h-4 w-4 mr-1" /> Add Subcategory
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(cat.subcategories || []).map((s) => (
                        <div key={s.slug} className="flex items-center justify-between border rounded p-2">
                          <div>
                            <div className="font-medium text-sm">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.slug}</div>
                          </div>
                          <div className="flex gap-2">
                            <InlineRename
                              onSave={(newName) => renameSubcategory(cat.slug, s.slug, newName)}
                              initial={s.name}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the subcategory "{s.name}" from "{cat.name}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSubcategory(cat.slug, s.slug)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                      {(!cat.subcategories || cat.subcategories.length === 0) && (
                        <div className="text-sm text-muted-foreground">No subcategories yet.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>

      <AddCategoryModal
        open={catModalOpen}
        onOpenChange={(v) => setCatModalOpen(v)}
        onCreated={() => {
          setCatModalOpen(false)
          fetchAll()
        }}
      />
    </AdminLayout>
  )
}

function InlineRename({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initial)
  return (
    <div>
      {editing ? (
        <div className="flex gap-2 items-center">
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-8 w-40" />
          <Button size="sm" onClick={() => { if (val.trim()) onSave(val.trim()); setEditing(false) }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setVal(initial); setEditing(false) }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Edit3 className="h-4 w-4 mr-1" /> Rename
        </Button>
      )}
    </div>
  )
}
