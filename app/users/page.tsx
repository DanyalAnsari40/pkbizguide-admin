"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Plus, Calendar, Building2, Edit, Trash2, Eye, History, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface User {
  _id: string
  name: string
  email: string
  role: "admin" | "user"
  createdAt: string
  businessCount: number
  lastLogin?: string
  tempPassword?: string
}

interface UserBusiness {
  _id: string
  name: string
  category: string
  city: string
  status: string
  createdAt: string
  source: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewingUserBusinesses, setViewingUserBusinesses] = useState<User | null>(null)
  const [userBusinesses, setUserBusinesses] = useState<UserBusiness[]>([])
  const [businessesDialogOpen, setBusinessesDialogOpen] = useState(false)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        const tempPassword = formData.password
        const tempEmail = formData.email
        
        toast({
          title: "Success",
          description: "User created successfully"
        })
        setDialogOpen(false)
        setFormData({ name: "", email: "", password: "", role: "user" })
        
        // Refresh users list
        fetchUsers()
        
        // Add temp password to show in UI after a short delay
        setTimeout(() => {
          setUsers(prev => prev.map(user => 
            user.email === tempEmail ? { ...user, tempPassword } : user
          ))
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create user",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      })
    }
  }

  const editUser = async () => {
    if (!editingUser) return
    try {
      const response = await fetch(`/api/users/${editingUser._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role
        })
      })

      if (response.ok) {
        toast({ title: "Success", description: "User updated successfully" })
        setEditDialogOpen(false)
        setEditingUser(null)
        fetchUsers()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        }
      })

      if (response.ok) {
        toast({ title: "Success", description: "User deleted successfully" })
        fetchUsers()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" })
    }
  }

  const fetchUserBusinesses = async (user: User) => {
    setLoadingBusinesses(true)
    setViewingUserBusinesses(user)
    setBusinessesDialogOpen(true)
    
    try {
      const response = await fetch(`/api/businesses?createdBy=${user._id}&history=true`, {
        headers: {
          Authorization: `Bearer ${document.cookie.split("; ").find(row => row.startsWith("admin-token="))?.split("=")[1]}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserBusinesses(data.businesses || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch user businesses",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      })
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              User Management
            </h1>
            <p className="text-slate-600 mt-2">Create and manage users who can add businesses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg rounded-xl px-6">
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user who can login and add businesses</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter user name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user information</DialogDescription>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-role">Role</Label>
                    <Select value={editingUser.role} onValueChange={(value) => setEditingUser({...editingUser, role: value as "admin" | "user"})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={editUser} className="w-full">Update User</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user._id} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="text-slate-800">{user.name}</span>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className={cn(
                    "rounded-full px-3 py-1",
                    user.role === "admin" 
                      ? "bg-gradient-to-r from-purple-500 to-blue-600 text-white" 
                      : "bg-slate-200 text-slate-700"
                  )}>
                    {user.role}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-600">{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-800">{user.businessCount}</div>
                        <div className="text-xs text-blue-600">Businesses Added</div>
                      </div>
                    </div>
                    {user.businessCount > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg"
                        onClick={() => fetchUserBusinesses(user)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {user.lastLogin && (
                    <div className="text-sm text-muted-foreground">
                      Last login: {new Date(user.lastLogin).toLocaleDateString()}
                    </div>
                  )}
                  
                  {user.tempPassword && (
                    <div className="text-sm font-mono bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-xl">
                      <span className="text-green-700 font-medium">Password: </span>
                      <span className="text-green-800">{user.tempPassword}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button size="sm" variant="outline" className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl" onClick={() => {
                    setEditingUser(user)
                    setEditDialogOpen(true)
                  }}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {user.businessCount > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-purple-200 text-purple-600 hover:bg-purple-50 rounded-xl"
                      onClick={() => fetchUserBusinesses(user)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl" onClick={() => deleteUser(user._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Businesses Dialog */}
        <Dialog open={businessesDialogOpen} onOpenChange={setBusinessesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Businesses Added by {viewingUserBusinesses?.name}
              </DialogTitle>
              <DialogDescription>
                Complete history of businesses added by this user
              </DialogDescription>
            </DialogHeader>
            
            {loadingBusinesses ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : userBusinesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No businesses found for this user</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-700">
                          {userBusinesses.filter(b => b.status === 'approved').length}
                        </div>
                        <div className="text-sm text-green-600">Approved</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-700">
                          {userBusinesses.filter(b => b.status === 'pending').length}
                        </div>
                        <div className="text-sm text-amber-600">Pending</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-700">
                          {userBusinesses.filter(b => b.status === 'rejected').length}
                        </div>
                        <div className="text-sm text-red-600">Rejected</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userBusinesses.map((business) => (
                        <TableRow key={business._id}>
                          <TableCell className="font-medium">{business.name}</TableCell>
                          <TableCell>{business.category}</TableCell>
                          <TableCell>{business.city}</TableCell>
                          <TableCell>{getStatusBadge(business.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {business.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(business.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}