"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2, LayoutDashboard, Clock, LogOut, Menu, X, Plus, XCircle, FolderPlus, Users, History } from "lucide-react"
import { cn } from "@/lib/utils"
 

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is authenticated
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("admin-token="))
      ?.split("=")[1]

    if (!token) {
      router.push("/login")
      return
    }

    // In a real app, you'd verify the token with your API
    setUser({ email: "admin@citation.com" })
  }, [router])





  const handleLogout = () => {
    document.cookie = "admin-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    router.push("/login")
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "All Businesses", href: "/businesses", icon: Building2 }, // Added all businesses link
    { name: "Add Business", href: "/businesses/add", icon: Building2 },
    { name: "Categories", href: "/categories", icon: FolderPlus },
    { name: "Users", href: "/users", icon: Users },
    { name: "Business History", href: "/business-history", icon: History },
    { name: "Pending Approvals", href: "/pending", icon: Clock },
    { name: "Rejected Listings", href: "/rejected", icon: XCircle },
  ]

  if (!user) {
    return <div className="min-h-screen bg-muted animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl transition-all duration-200 ease-in-out",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        <div className="flex items-center h-16 px-3 border-b border-slate-700 bg-slate-800/50">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5 text-white" />
          </Button>
          {sidebarOpen && (
            <div className="flex items-center gap-2 ml-2">
              <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-white">Citation</span>
            </div>
          )}
        </div>

        <nav className="mt-4 px-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-100",
                      isActive 
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-slate-700">
          {sidebarOpen ? (
            <div className="space-y-2">
            
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full gap-2 bg-red-600 hover:bg-red-700 rounded-lg" 
                onClick={handleLogout}
              >
                <LogOut className="h-3 w-3" />
                <span className="text-xs">Logout</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full p-2 bg-red-600 hover:bg-red-700 rounded-lg" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={cn("transition-all duration-200", sidebarOpen ? "pl-64" : "pl-16")}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 shadow-sm">
          <div className="flex-1" />
          <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg rounded-xl"> 
            <Link href="/businesses/add">
              <Plus className="h-4 w-4" />
              Add Business
            </Link>
          </Button>
        </div>

        {/* Page content */}
        <main className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">{children}</main>
      </div>
      
    </div>
  )
}
