import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

// ==========================================
// SPATIAL UI SWITCH COMPONENT
// ==========================================

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center",
      "rounded-full border-2 border-transparent",
      "shadow-elevation-1 transition-colors duration-200 ease-out",
      // Focus
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked/Unchecked states
      "data-[state=unchecked]:bg-surface-200",
      "data-[state=checked]:bg-primary",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full",
        "bg-white shadow-elevation-2",
        "transition-transform duration-200 ease-out",
        "data-[state=unchecked]:translate-x-0",
        "data-[state=checked]:translate-x-5"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
