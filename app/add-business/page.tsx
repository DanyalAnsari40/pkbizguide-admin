"use client"

import Link from "next/link"
import { AddBusinessForm } from "@/components/add-business-form"

export default function AddBusinessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">{`< Back to Home`}</Link>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Add Your Business</h1>
          <p className="text-muted-foreground mt-2">
            Join thousands of businesses on Pakistan's leading directory. It's free and takes just a few minutes.
          </p>
        </div>

        <AddBusinessForm />
      </div>
    </div>
  )
}
