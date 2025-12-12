"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { CalendarDays, Target, Repeat, BarChart3, Sparkles, Users } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Weekly Planner", icon: CalendarDays, tourId: "nav-planner" },
  { href: "/goals", label: "Yearly Goals", icon: Target, tourId: "nav-goals" },
  { href: "/recurring", label: "Recurring Tasks", icon: Repeat, tourId: "nav-recurring" },
  { href: "/monthly", label: "Monthly Overview", icon: BarChart3, tourId: "nav-monthly" },
  { href: "/wrapped", label: "Year Wrapped", icon: Sparkles, tourId: "nav-wrapped" },
]

export function DashboardNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get current year parameter to preserve it in navigation
  const yearParam = searchParams.get("year")
  const yearQuery = yearParam ? `?year=${yearParam}` : ""

  return (
    <nav className="hidden lg:flex flex-col w-56 border-r border-border min-h-[calc(100vh-3.5rem)] p-4 gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const href = `${item.href}${yearQuery}`
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={href}
            data-tour-id={item.tourId}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
