import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-foreground/70 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "flex field-sizing-content min-h-24 w-full rounded-md border bg-white px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
        "dark:bg-zinc-900",
        "hover:border-foreground/40",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
