import * as React from "react"

import { cn } from "lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-lg border border-[#E8EBF0] bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-150 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
