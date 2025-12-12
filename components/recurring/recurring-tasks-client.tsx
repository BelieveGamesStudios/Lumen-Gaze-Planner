"use client"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { useYear } from "@/contexts/year-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Repeat, Trash2, Pause, Play } from "lucide-react"
import type { RecurringTask, Tag } from "@/lib/types"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { CreateRecurringTaskDialog } from "./create-recurring-task-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface RecurringTasksClientProps {
  initialRecurringTasks: (RecurringTask & {
    total_instances: number
    completed_instances: number
  })[]
  initialTags: Tag[]
  currentWeek: number
  currentYear: number
  userId: string
}

const recurrenceLabels = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
}

export function RecurringTasksClient({
  initialRecurringTasks,
  initialTags,
  currentWeek,
  currentYear: initialYear,
  userId,
}: RecurringTasksClientProps) {
  const { selectedYear } = useYear()
  const [recurringTasks, setRecurringTasks] = useState(initialRecurringTasks)
  const [tags, setTags] = useState(initialTags)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  // Fetch recurring tasks data for the selected year
  const fetchRecurringTasksData = async () => {
    startTransition(async () => {
      // Fetch recurring tasks with their tags
      const { data: recurringTasks } = await supabase
        .from("recurring_tasks")
        .select(`
          *,
          tags:recurring_task_tags(tag:tags(*))
        `)
        .eq("user_id", userId)
        .eq("start_year", selectedYear)
        .order("created_at", { ascending: false })

      // Fetch all task instances for these recurring tasks
      const { data: taskInstances } = await supabase
        .from("recurring_task_instances")
        .select(`
          recurring_task_id,
          task:tasks(*)
        `)
        .eq("task.user_id", userId)
        .eq("task.year", selectedYear)

      // Fetch tags
      const { data: tags } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true })

      // Transform recurring tasks with completion percentage
      const transformedRecurringTasks =
        recurringTasks?.map((rt) => {
          const instances = taskInstances?.filter((ti) => ti.recurring_task_id === rt.id) || []
          const completedCount = instances.filter((ti) => (ti.task as any)?.completed).length
          const totalCount = instances.length

          return {
            ...rt,
            tags: rt.tags?.map((t: { tag: unknown }) => t.tag) || [],
            completion_percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            total_instances: totalCount,
            completed_instances: completedCount,
          }
        }) || []

      setRecurringTasks(transformedRecurringTasks)
      setTags(tags || [])
    })
  }

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Refresh data when year changes
  useEffect(() => {
    if (isHydrated) {
      fetchRecurringTasksData()
    }
  }, [selectedYear, isHydrated])

  // Initialize with server data
  useEffect(() => {
    if (selectedYear === initialYear) {
      setRecurringTasks(initialRecurringTasks)
      setTags(initialTags)
    }
  }, [])

  const handleCreateRecurringTask = async (
    title: string,
    description: string,
    recurrenceType: "daily" | "weekly" | "biweekly" | "monthly",
    selectedTagIds: string[],
  ) => {
    startTransition(async () => {
      // Create the recurring task
      const { data: newRecurringTask, error: rtError } = await supabase
        .from("recurring_tasks")
        .insert({
          user_id: userId,
          title,
          description: description || null,
          recurrence_type: recurrenceType,
          start_week: 1, // Always start from week 1 of the selected year
          start_year: selectedYear,
          is_active: true,
        })
        .select()
        .single()

      if (rtError || !newRecurringTask) return

      // Add tags if any
      if (selectedTagIds.length > 0) {
        await supabase.from("recurring_task_tags").insert(
          selectedTagIds.map((tagId) => ({
            recurring_task_id: newRecurringTask.id,
            tag_id: tagId,
          })),
        )
      }

      // Generate task instances for all weeks of the selected year
      const weeksToGenerate = getWeeksForRecurrence(recurrenceType, selectedYear)

      const tasksToInsert = weeksToGenerate.map((w) => ({
        user_id: userId,
        title,
        description: description || null,
        week_number: w.week,
        year: w.year,
        completed: false,
        sort_order: 0,
      }))

      const { data: insertedTasks } = await supabase.from("tasks").insert(tasksToInsert).select()

      // Create instance links
      if (insertedTasks) {
        await supabase.from("recurring_task_instances").insert(
          insertedTasks.map((task) => ({
            recurring_task_id: newRecurringTask.id,
            task_id: task.id,
          })),
        )

        // Add tags to each task
        if (selectedTagIds.length > 0) {
          const taskTagsToInsert = insertedTasks.flatMap((task) =>
            selectedTagIds.map((tagId) => ({
              task_id: task.id,
              tag_id: tagId,
            })),
          )
          await supabase.from("task_tags").insert(taskTagsToInsert)
        }
      }

      // Refresh the list
      const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
      setRecurringTasks([
        {
          ...newRecurringTask,
          tags: selectedTags,
          completion_percentage: 0,
          total_instances: weeksToGenerate.length,
          completed_instances: 0,
        },
        ...recurringTasks,
      ])

      setIsCreateDialogOpen(false)
    })
  }

  const handleToggleActive = async (taskId: string, isActive: boolean) => {
    startTransition(async () => {
      const { error } = await supabase.from("recurring_tasks").update({ is_active: !isActive }).eq("id", taskId)

      if (!error) {
        setRecurringTasks((prev) => prev.map((rt) => (rt.id === taskId ? { ...rt, is_active: !isActive } : rt)))
      }
    })
  }

  const handleDeleteRecurringTask = async () => {
    if (!deleteTaskId) return

    startTransition(async () => {
      // Delete all associated task instances first
      const { data: instances } = await supabase
        .from("recurring_task_instances")
        .select("task_id")
        .eq("recurring_task_id", deleteTaskId)

      if (instances) {
        const taskIds = instances.map((i) => i.task_id)
        await supabase.from("tasks").delete().in("id", taskIds)
      }

      // Delete the recurring task (cascades to instances)
      const { error } = await supabase.from("recurring_tasks").delete().eq("id", deleteTaskId)

      if (!error) {
        setRecurringTasks((prev) => prev.filter((rt) => rt.id !== deleteTaskId))
      }

      setDeleteTaskId(null)
    })
  }

  const getWeeksForRecurrence = (
    recurrenceType: "daily" | "weekly" | "biweekly" | "monthly",
    selectedYear: number,
  ): { week: number; year: number }[] => {
    const weeks: { week: number; year: number }[] = []

      switch (recurrenceType) {
        case "daily":
        case "weekly":
        // Add to all 52 weeks of the selected year
        for (let week = 1; week <= 52; week++) {
          weeks.push({ week, year: selectedYear })
        }
          break
        case "biweekly":
        // Add to every other week (weeks 1, 3, 5, 7, etc.)
        for (let week = 1; week <= 52; week += 2) {
          weeks.push({ week, year: selectedYear })
        }
          break
        case "monthly":
        // Add to every 4th week (approximately monthly)
        for (let week = 1; week <= 52; week += 4) {
          weeks.push({ week, year: selectedYear })
        }
          break
    }

    return weeks
  }

  const activeCount = recurringTasks.filter((rt) => rt.is_active).length
  const totalCompletionRate =
    recurringTasks.length > 0
      ? Math.round(recurringTasks.reduce((acc, rt) => acc + (rt.completion_percentage || 0), 0) / recurringTasks.length)
      : 0

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isHydrated ? selectedYear : initialYear} Recurring Tasks</h1>
          <p className="text-muted-foreground">
            {activeCount} active · {totalCompletionRate}% overall completion
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Recurring Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recurringTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCompletionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recurringTasks.reduce((acc, rt) => acc + rt.total_instances, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Tasks List */}
      {recurringTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No recurring tasks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a recurring task to automatically generate tasks across weeks.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Recurring Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recurringTasks.map((rt) => (
            <Card key={rt.id} className={!rt.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{rt.title}</h3>
                      <Badge variant="outline">{recurrenceLabels[rt.recurrence_type]}</Badge>
                      {!rt.is_active && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    {rt.description && <p className="text-sm text-muted-foreground">{rt.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {rt.tags?.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {rt.completed_instances} of {rt.total_instances} completed
                        </span>
                        <span className="font-medium">{rt.completion_percentage}%</span>
                      </div>
                      <Progress value={rt.completion_percentage} className="h-2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(rt.id, rt.is_active)}
                      title={rt.is_active ? "Pause" : "Resume"}
                    >
                      {rt.is_active ? (
                        <Pause className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTaskId(rt.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateRecurringTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        tags={tags}
        goals={[]}
        onCreateTask={handleCreateRecurringTask}
        isPending={isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the recurring task and all its generated task instances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecurringTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  )
}
