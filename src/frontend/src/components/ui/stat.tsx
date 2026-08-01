import * as React from "react"
import { cn } from "@/lib/utils"

// ==========================================
// SPATIAL UI STAT/CARD COMPONENT
// For displaying metrics and KPIs
// ==========================================

interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  description?: string
}

const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, label, value, trend, icon, description, ...props }, ref) => {
    const trendColors = {
      up: 'text-success',
      down: 'text-danger',
      neutral: 'text-secondary',
    }

    const trendBgColors = {
      up: 'bg-success/10',
      down: 'bg-danger/10',
      neutral: 'bg-surface-100',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "group relative p-6 rounded-xl",
          "bg-surface-0 shadow-surface",
          "border border-border/60",
          "transition-all duration-200",
          "hover:shadow-surface-hover hover:border-border",
          className
        )}
        {...props}
      >
        {/* Content */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Label */}
            <p className="text-sm font-medium text-secondary truncate">
              {label}
            </p>
            
            {/* Value */}
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>

            {/* Trend or Description */}
            {trend && (
              <div className={cn("mt-2 flex items-center gap-1.5", trendColors[trend.direction])}>
                <span className="inline-flex items-center text-sm font-medium">
                  {trend.direction === 'up' && '↑'}
                  {trend.direction === 'down' && '↓'}
                  {trend.direction === 'neutral' && '→'}
                  <span className="ml-1">{Math.abs(trend.value)}%</span>
                </span>
                <span className="text-xs text-secondary">vs geçen ay</span>
              </div>
            )}
            
            {description && (
              <p className="mt-2 text-sm text-secondary line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Icon */}
          {icon && (
            <div className={cn(
              "p-3 rounded-lg",
              "bg-surface-100 text-secondary",
              "transition-colors duration-200",
              "group-hover:bg-primary/10 group-hover:text-primary"
            )}>
              {icon}
            </div>
          )}
        </div>

        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    )
  }
)
Stat.displayName = "Stat"

// ==========================================
// STAT GRID COMPONENT
// For arranging multiple stats
// ==========================================

interface StatGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

const StatGrid = React.forwardRef<HTMLDivElement, StatGridProps>(
  ({ className, columns = 4, gap = 'md', ...props }, ref) => {
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    }

    const gapClasses = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          gridClasses[columns],
          gapClasses[gap],
          className
        )}
        {...props}
      />
    )
  }
)
StatGrid.displayName = "StatGrid"

export { Stat, StatGrid }
