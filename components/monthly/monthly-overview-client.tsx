"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useYear } from "@/contexts/year-context"
import { createClient } from "@/lib/supabase/client"
import { getMonthFromWeek } from "@/lib/utils/date"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CheckCircle2, ListTodo, TrendingUp } from "lucide-react"
import type { Tag } from "@/lib/types"
import { MobileNav } from "@/components/dashboard/mobile-nav"

interface MonthStat {
  month: number
  name: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  tagUsage: { tag: Tag | undefined; count: number }[]
  mostActiveWeek: number | null
}

interface MonthlyOverviewClientProps {
  monthlyStats: MonthStat[]
  currentYear: number
  userId: string
}

export function MonthlyOverviewClient({ monthlyStats: initialStats, currentYear: initialYear, userId }: MonthlyOverviewClientProps) {
  const { selectedYear } = useYear()
  const [monthlyStats, setMonthlyStats] = useState(initialStats)
  const [isHydrated, setIsHydrated] = useState(false)
  const supabase = createClient()
  const currentMonth = new Date().getMonth()

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch monthly stats for the selected year
  const fetchMonthlyStats = async () => {
    // Fetch all tasks for the year
    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        *,
        tags:task_tags(tag:tags(*))
      `)
      .eq("user_id", userId)
      .eq("year", selectedYear)

    // Fetch tags
    const { data: tags } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true })

    // Transform tasks
    const transformedTasks =
      tasks?.map((task) => ({
        ...task,
        tags: task.tags?.map((t: { tag: unknown }) => t.tag) || [],
      })) || []

    // Calculate monthly stats
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const newMonthlyStats = monthNames.map((name, monthIndex) => {
      // Find tasks for this month (based on week_number)
      const monthTasks = transformedTasks.filter((t) => {
        const taskMonth = getMonthFromWeek(t.week_number, selectedYear)
        return taskMonth === monthIndex
      })

      const completedTasks = monthTasks.filter((t) => t.completed).length
      const totalTasks = monthTasks.length

      // Calculate tag usage
      const tagCounts: Record<string, number> = {}
      monthTasks.forEach((task) => {
        task.tags?.forEach((tag: { id: string }) => {
          tagCounts[tag.id] = (tagCounts[tag.id] || 0) + 1
        })
      })

      const tagUsage = Object.entries(tagCounts)
        .map(([tagId, count]) => ({
          tag: tags?.find((t) => t.id === tagId),
          count,
        }))
        .filter((tu) => tu.tag)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)

      // Find most active week
      const weekCounts: Record<number, number> = {}
      monthTasks.forEach((task) => {
        weekCounts[task.week_number] = (weekCounts[task.week_number] || 0) + 1
      })
      const mostActiveWeek = Object.entries(weekCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null

      return {
        month: monthIndex,
        name,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        tagUsage,
        mostActiveWeek: mostActiveWeek ? Number.parseInt(mostActiveWeek) : null,
      }
    })

    setMonthlyStats(newMonthlyStats)
  }

  // Refresh data when year changes
  useEffect(() => {
    if (isHydrated) {
      fetchMonthlyStats()
    }
  }, [selectedYear, isHydrated])

  // Initialize with server data
  useEffect(() => {
    if (selectedYear === initialYear) {
      setMonthlyStats(initialStats)
    }
  }, [])

  const yearTotalTasks = monthlyStats.reduce((acc, m) => acc + m.totalTasks, 0)
  const yearCompletedTasks = monthlyStats.reduce((acc, m) => acc + m.completedTasks, 0)
  const yearCompletionRate = yearTotalTasks > 0 ? Math.round((yearCompletedTasks / yearTotalTasks) * 100) : 0

  const bestMonth = [...monthlyStats].sort((a, b) => b.completionRate - a.completionRate)[0]
  const mostProductiveMonth = [...monthlyStats].sort((a, b) => b.completedTasks - a.completedTasks)[0]

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{isHydrated ? selectedYear : initialYear} Monthly Overview</h1>
        <p className="text-muted-foreground">{isHydrated ? selectedYear : initialYear} progress by month</p>
      </div>

      {/* Year Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{yearTotalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{yearCompletedTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{yearCompletionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Best Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bestMonth?.name || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {monthlyStats.map((month) => (
          <Card
            key={month.month}
            className={
              month.month === currentMonth
                ? "border-primary/50 bg-primary/5"
                : month.month > currentMonth
                  ? "opacity-60"
                  : ""
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{month.name}</CardTitle>
                {month.month === currentMonth && (
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {month.completedTasks} / {month.totalTasks} tasks
                  </span>
                  <span className="font-medium">{month.completionRate}%</span>
                </div>
                <Progress value={month.completionRate} className="h-2" />
              </div>

              {/* Most Active Week */}
              {month.mostActiveWeek && (
                <p className="text-xs text-muted-foreground">Most active: Week {month.mostActiveWeek}</p>
              )}

              {/* Top Tags */}
              {month.tagUsage.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Top categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {month.tagUsage.map(({ tag, count }) =>
                      tag ? (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name} ({count})
                        </Badge>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              {month.totalTasks === 0 && <p className="text-xs text-muted-foreground italic">No tasks this month</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <MobileNav />
    </div>
  )
}
