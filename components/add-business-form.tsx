"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ChevronsUpDown, MapPin, Building, User, Phone, Mail, MessageSquare, Globe, Camera } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Progress } from "@/components/ui/progress"

interface FormState {
  businessName: string
  contactPersonName: string
  category: string
  subCategory?: string
  province: string
  city: string
  postalCode?: string
  address: string
  phone: string
  whatsapp?: string
  email: string
  description: string
  logoFile?: File | null
  websiteUrl?: string
  facebookUrl?: string
  gmbUrl?: string
  youtubeUrl?: string
  swiftCode?: string
  branchCode?: string
  cityDialingCode?: string
  iban?: string
}

export function AddBusinessForm({
  title = "List Your Business",
  description = "Join our directory and reach more customers",
  onSubmitted,
  onSuccess,
}: {
  title?: string
  description?: string
  onSubmitted?: () => void
  onSuccess?: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const DESCRIPTION_MAX = 1000
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  const [localCategories, setLocalCategories] = useState<string[]>([])
  
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const list: string[] = Array.isArray(data?.categories)
        ? data.categories.map((c: any) => c?.name || c?.slug).filter(Boolean)
        : []
      setLocalCategories(list)
    } catch {
      setLocalCategories([])
    }
  }
  
  useEffect(() => {
    fetchCategories()
  }, [])
  
  const [catOpen, setCatOpen] = useState(false)
  const [catQuery, setCatQuery] = useState("")
  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase()
    if (!q) return localCategories
    return localCategories.filter((c) => c.toLowerCase().includes(q))
  }, [catQuery, localCategories])
  
  useEffect(() => {
    if (catOpen) fetchCategories()
  }, [catOpen])
  
  const [subCatOpen, setSubCatOpen] = useState(false)
  const [subCatQuery, setSubCatQuery] = useState("")
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([])
  const [subCatLoading, setSubCatLoading] = useState(false)
  const filteredSubCategories = useMemo(() => {
    const q = subCatQuery.trim().toLowerCase()
    if (!q) return subCategoryOptions
    return subCategoryOptions.filter((s) => s.toLowerCase().includes(q))
  }, [subCatQuery, subCategoryOptions])
  
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [provinces, setProvinces] = useState<Array<{ id: string; name: string }>>([])
  const [cityOptions, setCityOptions] = useState<Array<{ id: string; name: string }>>([])
  const [provLoading, setProvLoading] = useState(false)
  const [cityLoading, setCityLoading] = useState(false)
  const [cityQuery, setCityQuery] = useState("")
  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return cityOptions
    return cityOptions.filter((c) => c.name.toLowerCase().includes(q))
  }, [cityQuery, cityOptions])
  
  const [form, setForm] = useState<FormState>({
    businessName: "",
    contactPersonName: "",
    category: "",
    subCategory: "",
    province: "",
    city: "",
    postalCode: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    description: "",
    logoFile: null,
    websiteUrl: "",
    facebookUrl: "",
    gmbUrl: "",
    youtubeUrl: "",
    swiftCode: "",
    branchCode: "",
    cityDialingCode: "",
    iban: "",
  })

  const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")

  const fetchSubcategories = async (categoryName?: string) => {
    const cat = categoryName || form.category?.trim()
    if (!cat) {
      setSubCategoryOptions([])
      return
    }
    try {
      setSubCatLoading(true)
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(toSlug(cat))}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const list: string[] = Array.isArray(data?.category?.subcategories)
        ? data.category.subcategories.map((s: any) => s?.name || s?.slug).filter(Boolean)
        : []
      setSubCategoryOptions(list)
    } catch (e) {
      setSubCategoryOptions([])
    } finally {
      setSubCatLoading(false)
    }
  }

  useEffect(() => { fetchSubcategories() }, [form.category])
  useEffect(() => { if (subCatOpen) fetchSubcategories() }, [subCatOpen])

  const completionPercentage = useMemo(() => {
    const requiredFields = [
      form.businessName,
      form.category,
      form.province,
      form.city,
      form.postalCode,
      form.address,
      form.phone,
      form.email,
      form.description,
      form.logoFile
    ];
    
    const filledCount = requiredFields.filter(field => 
      field !== null && field !== undefined && field !== ''
    ).length;
    
    return Math.round((filledCount / requiredFields.length) * 100);
  }, [form]);

  useEffect(() => {
    const run = async () => {
      try {
        setProvLoading(true)
        const res = await fetch("/api/provinces", { cache: "no-store" })
        const data = await res.json()
        setProvinces(Array.isArray(data) ? data : data?.provinces ?? [])
      } catch (e) {
        setProvinces([])
      } finally {
        setProvLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    const run = async () => {
      try {
        setCityLoading(true)
        const res = await fetch("/api/cities", { cache: "no-store" })
        const data = await res.json()
        console.log('Cities API response:', data)
        setCityOptions(Array.isArray(data) ? data : data?.cities ?? [])
      } catch (e) {
        console.error('Cities API error:', e)
        setCityOptions([])
      } finally {
        setCityLoading(false)
      }
    }
    run()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setForm((prev) => ({ ...prev, [id]: value }))
    if (globalError) setGlobalError(null)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setForm((prev) => ({ ...prev, logoFile: file }))
    if (file) {
      const url = URL.createObjectURL(file)
      setLogoPreview(url)
    } else {
      setLogoPreview(null)
    }
    if (globalError) setGlobalError(null)
  }

  const validate = () => {
    const required = [
      ["businessName", form.businessName],
      ["category", form.category],
      ["province", form.province],
      ["city", form.city],
      ["postalCode", form.postalCode],
      ["address", form.address],
      ["phone", form.phone],
      ["email", form.email],
      ["description", form.description],
    ] as const

    const missing = required.filter(([, v]) => !v || String(v).trim() === "").map(([k]) => k)
    if (missing.length) {
      setGlobalError("Please fill all required fields")
      return false
    }
    
    if (!form.logoFile) {
      setGlobalError("Please fill all required fields")
      return false
    }
    setGlobalError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("businessName", form.businessName)
      fd.set("contactPersonName", form.contactPersonName)
      fd.set("category", form.category)
      fd.set("subCategory", form.subCategory || "")
      fd.set("province", form.province)
      fd.set("city", form.city)
      fd.set("postalCode", form.postalCode || "")
      fd.set("address", form.address)
      fd.set("phone", form.phone)
      fd.set("whatsapp", form.whatsapp || "")
      fd.set("email", form.email)
      fd.set("description", form.description)
      fd.set("websiteUrl", form.websiteUrl || "")
      fd.set("facebookUrl", form.facebookUrl || "")
      fd.set("gmbUrl", form.gmbUrl || "")
      fd.set("youtubeUrl", form.youtubeUrl || "")
      fd.set("swiftCode", form.swiftCode || "")
      fd.set("branchCode", form.branchCode || "")
      fd.set("cityDialingCode", form.cityDialingCode || "")
      fd.set("iban", form.iban || "")
      if (form.logoFile) fd.set("logoFile", form.logoFile)
      
      const token = document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]
      const res = await fetch("/api/businesses", { 
        method: "POST", 
        body: fd,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        setForm({
          businessName: "",
          contactPersonName: "",
          category: "",
          subCategory: "",
          province: "",
          city: "",
          postalCode: "",
          address: "",
          phone: "",
          whatsapp: "",
          email: "",
          description: "",
          logoFile: null,
          websiteUrl: "",
          facebookUrl: "",
          gmbUrl: "",
          youtubeUrl: "",
          swiftCode: "",
          branchCode: "",
          cityDialingCode: "",
          iban: "",
        })
        setLogoPreview(null)
        toast({ title: "Submitted", description: "Your business has been submitted for review (24–48 hours)." })
        onSubmitted?.()
        onSuccess?.()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Submission failed", description: data?.error || "Please try again.", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Network error", description: "Please check your connection.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        
        <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <h2 className="text-2xl font-bold">Business Listing Form</h2>
            <p className="opacity-90">Complete your profile to get discovered by more customers</p>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-bold">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2 bg-blue-800" />
            </div>
          </div>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-600 p-2 rounded-lg mr-3">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Business Identity</h3>
                    <p className="text-gray-600">Your NAP (Name, Address, Phone) information</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <Label htmlFor="businessName" className="text-gray-700 font-medium mb-2 block">Business Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="businessName" 
                        placeholder="Enter your business name" 
                        value={form.businessName} 
                        onChange={handleChange} 
                        className={`h-12 pl-10 focus:border-blue-500 ${globalError && !form.businessName.trim() ? 'border-red-500' : 'border-gray-300'}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-gray-700 font-medium mb-2 block">Complete Address <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="address" 
                        placeholder="Street address, building, floor, etc." 
                        value={form.address} 
                        onChange={handleChange} 
                        className={`h-12 pl-10 focus:border-blue-500 ${globalError && !form.address.trim() ? 'border-red-500' : 'border-gray-300'}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-gray-700 font-medium mb-2 block">Phone Number <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="phone" 
                        placeholder="+92-XXX-XXXXXXX" 
                        value={form.phone} 
                        onChange={handleChange} 
                        className={`h-12 pl-10 focus:border-blue-500 ${globalError && !form.phone.trim() ? 'border-red-500' : 'border-gray-300'}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="whatsapp" className="text-gray-700 font-medium mb-2 block">WhatsApp Number</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="whatsapp" 
                        placeholder="+92-XXX-XXXXXXX" 
                        value={form.whatsapp} 
                        onChange={handleChange} 
                        className="h-12 pl-10 border-gray-300 focus:border-blue-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="contactPersonName" className="text-gray-700 font-medium mb-2 block">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="contactPersonName" 
                        placeholder="Who will answer the phone?" 
                        value={form.contactPersonName} 
                        onChange={handleChange} 
                        className="h-12 pl-10 border-gray-300 focus:border-blue-500" 
                      />
                    </div>
                  </div>

                  {form.category && form.category.toLowerCase() === 'bank' && (
                    <>
                      <div>
                        <Label htmlFor="swiftCode" className="text-gray-700 font-medium mb-2 block">Swift Code <span className="text-red-500">*</span></Label>
                        <Input
                          id="swiftCode"
                          placeholder="e.g. HABBPKKA"
                          value={form.swiftCode || ""}
                          onChange={handleChange}
                          className="h-12 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="branchCode" className="text-gray-700 font-medium mb-2 block">Branch Code <span className="text-red-500">*</span></Label>
                        <Input
                          id="branchCode"
                          placeholder="e.g. 1234"
                          value={form.branchCode || ""}
                          onChange={handleChange}
                          className="h-12 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cityDialingCode" className="text-gray-700 font-medium mb-2 block">City Dialing Code <span className="text-red-500">*</span></Label>
                        <Input
                          id="cityDialingCode"
                          placeholder="e.g. 042"
                          value={form.cityDialingCode || ""}
                          onChange={handleChange}
                          className="h-12 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div className="lg:col-span-3">
                        <Label htmlFor="iban" className="text-gray-700 font-medium mb-2 block">IBAN <span className="text-red-500">*</span></Label>
                        <Input
                          id="iban"
                          placeholder="Paste/generated IBAN"
                          value={form.iban || ""}
                          onChange={handleChange}
                          className="h-12 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <div className="flex items-center mb-6">
                  <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Location & Category</h3>
                    <p className="text-gray-600">Where your business is located and what you do</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Province <span className="text-red-500">*</span></Label>
                    <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={provinceOpen} className={`w-full justify-between h-12 bg-white ${globalError && !form.province.trim() ? 'border-red-500' : 'border-gray-300'}`}>
                          <span className="truncate">{form.province || (provLoading ? "Loading..." : "Select province")}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search province..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No province found.</CommandEmpty>
                            <CommandGroup>
                              {provinces.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => {
                                    setForm((s) => ({ ...s, province: p.name }));
                                    setCityQuery("")
                                    setProvinceOpen(false)
                                  }}
                                >
                                  {p.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">City <span className="text-red-500">*</span></Label>
                    <Popover open={cityOpen} onOpenChange={setCityOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={cityOpen} className={`w-full justify-between h-12 bg-white ${globalError && !form.city.trim() ? 'border-red-500' : 'border-gray-300'}`}>
                          <span className="truncate">{form.city || (cityLoading ? "Loading..." : "Select city")}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search city..." value={cityQuery} onValueChange={setCityQuery} className="h-9" />
                          <CommandList>
                            <CommandEmpty>No city found. ({cityOptions.length} cities loaded)</CommandEmpty>
                            <CommandGroup>
                              {filteredCities.map((c) => (
                                <CommandItem key={c.id} value={c.name} onSelect={() => { setForm((s) => ({ ...s, city: c.name })); setCityOpen(false); setCityQuery("") }}>
                                  {c.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="postalCode" className="text-gray-700 font-medium mb-2 block">Postal Code <span className="text-red-500">*</span></Label>
                    <Input
                      id="postalCode"
                      placeholder="e.g. 54000"
                      value={form.postalCode || ""}
                      onChange={handleChange}
                      className={`h-12 focus:border-blue-500 ${globalError && !String(form.postalCode || '').trim() ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium mb-2 block">Email Address <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="business@example.com" 
                        value={form.email} 
                        onChange={handleChange} 
                        className={`h-12 pl-10 focus:border-blue-500 ${globalError && !form.email.trim() ? 'border-red-500' : 'border-gray-300'}`} 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium mb-2 block">Category <span className="text-red-500">*</span></Label>
                    <Popover open={catOpen} onOpenChange={setCatOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={catOpen} className={`w-full justify-between h-12 bg-white ${globalError && !form.category.trim() ? 'border-red-500' : 'border-gray-300'}`}>
                          <span className="truncate">{form.category ? form.category : "Select or type a category"}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search or type to create..." value={catQuery} onValueChange={setCatQuery} className="h-9" />
                          <CommandList>
                            <CommandGroup heading="Categories">
                              {filteredCategories.map((c) => (
                                <CommandItem
                                  key={c}
                                  value={c}
                                  onSelect={(val) => {
                                    setForm((p) => ({ ...p, category: val, subCategory: "" }))
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
                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium mb-2 block">Sub Category</Label>
                    <Popover open={subCatOpen} onOpenChange={setSubCatOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={subCatOpen} className="w-full justify-between h-12 border-gray-300 bg-white">
                          <span className="truncate">{form.subCategory || (subCatLoading ? "Loading..." : (subCategoryOptions.length ? "Select subcategory" : "Type to create or select"))}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search or type to create..." value={subCatQuery} onValueChange={setSubCatQuery} className="h-9" />
                          <CommandList>
                            <CommandGroup heading={form.category ? `Subcategories of ${form.category}` : "Subcategories"}>
                              {filteredSubCategories.map((s) => (
                                <CommandItem
                                  key={s}
                                  value={s}
                                  onSelect={(val) => {
                                    setForm((p) => ({ ...p, subCategory: val }))
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
                </div>
              </section>

              <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-600 p-2 rounded-lg mr-3">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Contact & Description</h3>
                    <p className="text-gray-600">How customers can reach you and what you offer</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description" className="text-gray-700 font-medium mb-2 block">Business Description <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your business, services, and what makes you unique..."
                        value={form.description}
                        onChange={handleChange}
                        maxLength={DESCRIPTION_MAX}
                        rows={4}
                        className={`focus:border-blue-500 ${globalError && !form.description.trim() ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Tips: Add services, specialties, and years of experience.</span>
                        <span>{form.description.length}/{DESCRIPTION_MAX}</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="logo" className="text-gray-700 font-medium mb-2 block">Business Logo <span className="text-red-500">*</span></Label>
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-400" />
                          </div>
                          <Input 
                            id="logo" 
                            type="file" 
                            accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                            onChange={handleFile} 
                            className="h-12 border-gray-300 focus:border-blue-500 opacity-0 z-10" 
                          />
                          <div className={`absolute inset-0 flex items-center px-3 pointer-events-none border rounded-md bg-gray-50 ${globalError && !form.logoFile ? 'border-red-500' : 'border-gray-300'}`}>
                            <span className="text-gray-500 ml-8 text-sm">Upload JPG, PNG, SVG, or WebP</span>
                          </div>
                        </div>
                        {logoPreview && (
                          <div className="flex justify-center">
                            <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg border-2 border-dashed border-blue-300 object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <div className="flex items-center mb-6">
                  <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Digital Presence (Optional)</h3>
                    <p className="text-gray-600">Enhance your listing with social media and website links</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="websiteUrl" className="text-gray-600 font-medium mb-2 block">Website URL</Label>
                    <Input 
                      id="websiteUrl" 
                      placeholder="https://www.example.com" 
                      value={form.websiteUrl} 
                      onChange={handleChange} 
                      className="h-12 border-gray-300 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookUrl" className="text-gray-600 font-medium mb-2 block">Facebook Page</Label>
                    <Input 
                      id="facebookUrl" 
                      placeholder="https://facebook.com/yourpage" 
                      value={form.facebookUrl} 
                      onChange={handleChange} 
                      className="h-12 border-gray-300 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="gmbUrl" className="text-gray-600 font-medium mb-2 block">Google Business Profile</Label>
                    <Input 
                      id="gmbUrl" 
                      placeholder="https://maps.google.com/?cid=..." 
                      value={form.gmbUrl} 
                      onChange={handleChange} 
                      className="h-12 border-gray-300 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="youtubeUrl" className="text-gray-600 font-medium mb-2 block">YouTube Channel</Label>
                    <Input 
                      id="youtubeUrl" 
                      placeholder="https://youtube.com/@yourchannel" 
                      value={form.youtubeUrl} 
                      onChange={handleChange} 
                      className="h-12 border-gray-300 focus:border-indigo-500" 
                    />
                  </div>
                </div>
              </section>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-xl">
                {globalError && (
                  <div className="mb-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
                    {globalError}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-white text-blue-700 hover:bg-blue-50 font-bold text-lg rounded-lg shadow-md" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    "Submit Business Listing"
                  )}
                </Button>
                <p className="text-blue-100 text-center mt-3 text-sm">
                  Your business will be reviewed and published within 24-48 hours
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}