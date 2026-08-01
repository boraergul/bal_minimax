import * as React from "react"
import { cn } from "@/lib/utils"

// ==========================================
// SPATIAL UI SURFACE COMPONENT
// Layered surfaces with depth
// ==========================================

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: 0 | 1 | 2 | 3 | 4 | 5
  variant?: 'solid' | 'subtle' | 'outline'
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, depth = 1, variant = 'solid', ...props }, ref) => {
    const depthClasses = {
      0: 'bg-transparent',
      1: 'bg-surface-0 shadow-elevation-1',
      2: 'bg-surface-0 shadow-elevation-2',
      3: 'bg-surface-0 shadow-elevation-3',
      4: 'bg-surface-0 shadow-elevation-4',
      5: 'bg-surface-0 shadow-elevation-5',
    }

    const variantClasses = {
      solid: 'bg-surface-0',
      subtle: 'bg-surface-50',
      outline: 'bg-transparent border border-border/60',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl transition-shadow duration-200",
          depthClasses[depth],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Surface.displayName = "Surface"

// ==========================================
// SPATIAL UI PANEL COMPONENT
// For sidebars, sections, and containers
// ==========================================

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'left' | 'right' | 'top' | 'bottom'
  elevated?: boolean
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, position = 'left', elevated = false, ...props }, ref) => {
    const positionClasses = {
      left: 'border-r',
      right: 'border-l',
      top: 'border-b',
      bottom: 'border-t',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-0",
          elevated ? "shadow-elevation-2" : "shadow-surface",
          positionClasses[position],
          className
        )}
        {...props}
      />
    )
  }
)
Panel.displayName = "Panel"

// ==========================================
// SPATIAL UI DIVIDER COMPONENT
// Visual separator with spatial awareness
// ==========================================

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = 'horizontal', variant = 'solid', spacing = 'md', ...props }, ref) => {
    const spacingClasses = {
      none: '',
      sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
      md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
      lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',
    }

    const variantClasses = {
      solid: 'border-border/60',
      dashed: 'border-dashed border-border/60',
      dotted: 'border-dotted border-border/60',
    }

    return (
      <div
        ref={ref}
        role="separator"
        className={cn(
          orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-r',
          variantClasses[variant],
          spacingClasses[spacing],
          className
        )}
        {...props}
      />
    )
  }
)
Divider.displayName = "Divider"

// ==========================================
// SPATIAL UI SPACING COMPONENT
// Consistent spacing helpers
// ==========================================

interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-1 w-1',
      sm: 'h-2 w-2',
      md: 'h-4 w-4',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
      '2xl': 'h-12 w-12',
    }

    return <div ref={ref} className={cn(sizeClasses[size], className)} {...props} />
  }
)
Spacer.displayName = "Spacer"

export { Surface, Panel, Divider, Spacer }
