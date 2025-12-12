import { createClient } from "@/lib/supabase/server"
import { getCurrentWeek, getMonthFromWeek } from "@/lib/utils/date"
import { MonthlyOverviewClient } from "@/components/monthly/monthly-overview-client"

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { year: currentYear } = getCurrentWeek()
  const params = await searchParams
  const requestedYear = params.year ? parseInt(params.year, 10) : NaN
  const selectedYear = Number.isFinite(requestedYear) ? requestedYear : currentYear

  // Fetch all tasks for the year
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      tags:task_tags(tag:tags(*))
    `)
    .eq("user_id", user.id)
    .eq("year", selectedYear)

  // Fetch tags
  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  // Transform tasks
  const transformedTasks =
    tasks?.map((task) => ({
      ...task,
      tags: task.tags?.map((t: { tag: unknown }) => t.tag) || [],
    })) || []

  // Calculate monthly stats
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const monthlyStats = monthNames.map((name, monthIndex) => {
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

  return <MonthlyOverviewClient monthlyStats={monthlyStats} currentYear={selectedYear} userId={user.id} />
}
