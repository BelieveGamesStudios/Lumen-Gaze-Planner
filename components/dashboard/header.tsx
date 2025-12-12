"use client"

import type React from "react"

import type { User } from "@supabase/supabase-js"
import { CalendarDays, Search, Moon, Sun, LogOut, Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { YearPicker } from "@/components/dashboard/year-picker"

export function DashboardHeader({ user }: { user: User }) {
  const { setTheme, theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [invitations, setInvitations] = useState<any[]>([])
  const supabase = createClient()
  const { toast } = useToast()
  const thisYear = new Date().getFullYear()
  const selectedYearParam = searchParams.get("year")
  const selectedYear = selectedYearParam && !Number.isNaN(parseInt(selectedYearParam, 10))
    ? parseInt(selectedYearParam, 10)
    : thisYear

  useEffect(() => {
    const fetchInvites = async () => {
      if (!user?.email) return
      const { data } = await supabase
        .from("team_invitations")
        .select("id,team_id,role,invited_display_name,team:teams(name),created_at")
        .eq("invited_email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())

      const invitesWithType = (data || []).map((inv: any) => ({ ...inv, type: "invitation" }))
      setInvitations(invitesWithType)
    }

    fetchInvites()
  }, [user?.email])

  useEffect(() => {
    // listen for in-app notifications (e.g., week complete)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("lumen-notifications")
      bc.addEventListener("message", (ev) => {
        const msg = ev.data
        if (msg?.type === "week_complete") {
          const { payload } = msg
          const entry = {
            id: payload.id,
            type: "week_complete",
            team: { name: payload.message },
            role: "",
            team_id: null,
            created_at: new Date().toISOString(),
          }
          setInvitations((prev) => [entry, ...(prev || [])])
        }
      })
    } catch (e) {
      // ignore if BroadcastChannel not available
    }

    return () => {
      try {
        bc?.close()
      } catch (e) {}
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleYearSelect = (year: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.push(`${pathname}?${params.toString()}`)
  }

  const initials = user.user_metadata?.display_name
    ? user.user_metadata.display_name.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="font-semibold hidden sm:inline">Lumen Gaze Planner</span>
        </Link>

        <div className="flex-1 flex items-center gap-3 mx-4 max-w-2xl">
          <YearPicker
            selectedYear={selectedYear}
            onYearSelect={handleYearSelect}
            currentYear={thisYear}
          />

          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9 bg-secondary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {invitations.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                    {invitations.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <div className="p-2">
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Team invitations and updates</p>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-48 overflow-y-auto">
                {invitations.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No notifications</div>
                ) : (
                  invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 p-3 hover:bg-secondary/50 group">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{inv.team?.name || inv.team?.name || "Notification"}</div>
                        {inv.type === "invitation" && (
                          <div className="text-xs text-muted-foreground">Role: {inv.role}</div>
                        )}
                      </div>
                      <div className="flex gap-1 items-center">
                        {inv.type === "invitation" && inv.team_id && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.from("team_members").insert({
                                    team_id: inv.team_id,
                                    user_id: user.id,
                                    role: inv.role,
                                  })
                                  if (error) throw error
                                  await supabase.from("team_invitations").update({ status: "accepted" }).eq("id", inv.id)
                                  setInvitations((prev) => prev.filter((i) => i.id !== inv.id))
                                  toast({ title: "Invitation accepted" })
                                } catch (err) {
                                  console.error(err)
                                  toast({ title: "Failed to accept invitation", variant: "destructive" })
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await supabase.from("team_invitations").update({ status: "rejected" }).eq("id", inv.id)
                                  setInvitations((prev) => prev.filter((i) => i.id !== inv.id))
                                  toast({ title: "Invitation rejected" })
                                } catch (err) {
                                  console.error(err)
                                  toast({ title: "Failed to reject", variant: "destructive" })
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setInvitations((prev) => prev.filter((i) => i.id !== inv.id))}
                          title="Dismiss notification"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="text-sm font-medium">
                  {user.user_metadata?.display_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <OnboardingTour />
    </header>
  )
}
