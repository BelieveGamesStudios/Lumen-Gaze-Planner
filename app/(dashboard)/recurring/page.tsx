import { createClient } from "@/lib/supabase/server"
import { getCurrentWeek } from "@/lib/utils/date"
import { RecurringTasksClient } from "@/components/recurring/recurring-tasks-client"

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { week: currentWeek, year: currentYear } = getCurrentWeek()
  const params = await searchParams
  const requestedYear = params.year ? parseInt(params.year, 10) : NaN
  const selectedYear = Number.isFinite(requestedYear) ? requestedYear : currentYear

  // Fetch goals for the selected year
  const { data: goals } = await supabase
    .from("yearly_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", selectedYear)
    .order("created_at", { ascending: true })

  // Fetch recurring tasks with their tags
  const { data: recurringTasks } = await supabase
    .from("recurring_tasks")
    .select(`
      *,
      tags:recurring_task_tags(tag:tags(*))
    `)
    .eq("user_id", user.id)
    .eq("start_year", selectedYear)
    .order("created_at", { ascending: false })

  // Fetch all task instances for these recurring tasks
  const { data: taskInstances } = await supabase
    .from("recurring_task_instances")
    .select(`
      recurring_task_id,
      task:tasks(*)
    `)
    .eq("task.user_id", user.id)
    .eq("task.year", selectedYear)

  // Fetch tags
  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  // Transform recurring tasks with completion percentage
  const transformedRecurringTasks =
    recurringTasks?.map((rt) => {
      const instances = taskInstances?.filter((ti) => ti.recurring_task_id === rt.id) || []
      const completedCount = instances.filter((ti) => ti.task?.completed).length
      const totalCount = instances.length

      return {
        ...rt,
        tags: rt.tags?.map((t: { tag: unknown }) => t.tag) || [],
        completion_percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        total_instances: totalCount,
        completed_instances: completedCount,
      }
    }) || []

  return (
    <RecurringTasksClient
      initialRecurringTasks={transformedRecurringTasks}
      initialTags={tags || []}
      initialGoals={goals || []}
      currentWeek={currentWeek}
      currentYear={selectedYear}
      userId={user.id}
    />
  )
}
