import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base visual prominence
        "file:text-foreground placeholder:text-foreground/70 selection:bg-primary selection:text-primary-foreground",
        "border-input flex h-11 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none",
        // Dark mode background
        "dark:bg-zinc-900",
        // File input tweaks
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // States
        "hover:border-foreground/40",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
