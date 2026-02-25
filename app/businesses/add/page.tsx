"use client"

import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { AddBusinessForm } from "@/components/add-business-form"

export default function AdminAddBusinessPage() {
  const router = useRouter()
  return (
    <AdminLayout>
      <div className="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-4xl mx-auto p-6 py-10">

          <AddBusinessForm onSubmitted={() => router.push("/pending")} />
        </div>
      </div>
    </AdminLayout>
  )
}
