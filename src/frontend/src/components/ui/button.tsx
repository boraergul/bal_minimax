import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ==========================================
// SPATIAL UI BUTTON COMPONENT
// Elevation-aware, consistent touch targets
// ==========================================

const buttonVariants = cva(
  // Base styles - Spatial UI principles
  "inline-flex items-center justify-center gap-2",
  "whitespace-nowrap rounded-lg text-sm font-medium",
  "ring-offset-background transition-all duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
  // Touch target size (minimum 44px)
  "select-none",
  {
    variants: {
      variant: {
        // Primary - Elevated with shadow
        default: [
          "bg-primary text-white shadow-elevation-2",
          "hover:bg-primary/90 hover:shadow-elevation-3 active:shadow-elevation-1",
          "active:scale-[0.98]",
        ].join(" "),
        
        // Secondary - Subtle elevation
        secondary: [
          "bg-surface-100 text-foreground shadow-elevation-1",
          "hover:bg-surface-200 hover:shadow-elevation-2 active:shadow-elevation-0",
          "active:scale-[0.98]",
        ].join(" "),
        
        // Outline - Floating appearance
        outline: [
          "border-2 border-border/80 bg-surface-0 shadow-elevation-1",
          "hover:border-primary/50 hover:shadow-elevation-2 hover:bg-surface-50",
          "active:shadow-elevation-0 active:scale-[0.98]",
        ].join(" "),
        
        // Ghost - No elevation, subtle hover
        ghost: [
          "bg-transparent text-foreground",
          "hover:bg-surface-100 active:bg-surface-200",
        ].join(" "),
        
        // Destructive - Red with emphasis
        destructive: [
          "bg-danger text-white shadow-elevation-2",
          "hover:bg-danger/90 hover:shadow-elevation-3",
          "active:shadow-elevation-1 active:scale-[0.98]",
        ].join(" "),
        
        // Success - Green confirmation
        success: [
          "bg-success text-white shadow-elevation-2",
          "hover:bg-success/90 hover:shadow-elevation-3",
          "active:shadow-elevation-1 active:scale-[0.98]",
        ].join(" "),
        
        // Warning - Caution state
        warning: [
          "bg-warning text-white shadow-elevation-2",
          "hover:bg-warning/90 hover:shadow-elevation-3",
          "active:shadow-elevation-1 active:scale-[0.98]",
        ].join(" "),
        
        // Link - Minimal interaction
        link: "text-primary underline-offset-4 hover:underline",
      },
      
      size: {
        // Spatial UI size scale (consistent padding)
        xs: "h-7 px-2.5 text-xs rounded-md",      // 28px - tight spaces
        sm: "h-9 px-3.5 text-sm rounded-lg",      // 36px - compact
        default: "h-10 px-4 text-sm rounded-lg",   // 40px - standard
        lg: "h-12 px-6 text-base rounded-xl",      // 48px - spacious
        xl: "h-14 px-8 text-lg rounded-xl",         // 56px - emphasis
        
        // Special sizes
        icon: "h-10 w-10 rounded-lg",              // Square, icon-only
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-xl",
        
        // Touch-friendly minimum (44px)
        touch: "min-h-[44px] min-w-[44px] rounded-lg",
      },
    },
    
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Extract the variant and size types explicitly
type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "link"
type ButtonSize = "xs" | "sm" | "default" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg" | "touch"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant: variant as any, size: size as any, className }),
          loading && "cursor-wait"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            {/* Loading spinner */}
            <svg 
              className="animate-spin h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Yükleniyor</span>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// ==========================================
// BUTTON GROUP COMPONENT
// For related actions
// ==========================================

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  connected?: boolean
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = 'horizontal', connected = true, children, ...props }, ref) => {
    const orientationClasses = {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    }

    const connectedClasses = connected
      ? orientation === 'horizontal'
        ? '[&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none [&>button:not(:first-child)]:-ml-px'
        : '[&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-b-none [&>button:last-child]:rounded-t-none [&>button:not(:first-child)]:-mt-px'
      : 'gap-2'

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex",
          orientationClasses[orientation],
          connectedClasses,
          className
        )}
        {...props}
      />
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

export { Button, buttonVariants, ButtonGroup }
