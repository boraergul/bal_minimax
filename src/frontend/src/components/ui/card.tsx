import * as React from "react"
import { cn } from "@/lib/utils"

// ==========================================
// SPATIAL UI CARD COMPONENT
// Implements depth, elevation, and 8px grid
// ==========================================

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    elevation?: 'flat' | 'raised' | 'floating'
    interactive?: boolean
  }
>(({ className, elevation = 'raised', interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles
      "rounded-xl border border-border/60 bg-surface text-foreground",
      // Elevation levels
      elevation === 'flat' && "shadow-none",
      elevation === 'raised' && "shadow-surface",
      elevation === 'floating' && "shadow-surface-raised",
      // Interactive state
      interactive && [
        "cursor-pointer transition-all duration-200",
        "hover:shadow-surface-hover hover:border-border",
        "active:scale-[0.995]",
      ],
      // Focus state for accessibility
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1.5 p-6",  // 8px grid: 24px padding
      "border-b border-border/60",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight",  // 18px, not 2xl
      "text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-secondary leading-relaxed",  // Better line height for readability
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-6", className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 p-6 pt-0",  // Consistent gap between elements
      "border-t border-border/60",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
