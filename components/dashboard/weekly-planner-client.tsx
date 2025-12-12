"use client"

import { useState, useTransition, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useYear } from "@/contexts/year-context"
import { WeekCard } from "./week-card"
import { ProgressHeatmap } from "./progress-heatmap"
import { TagFilter } from "./tag-filter"
import { MobileNav } from "./mobile-nav"
import { Button } from "@/components/ui/button"
import { TagIcon, X } from "lucide-react"
import type { Task, Tag } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WeeklyPlannerClientProps {
  initialTasks: Task[]
  initialTags: Tag[]
  weeklyCompletions: { week: number; completed: number; total: number }[]
  currentWeek: number
  currentYear: number
  userId: string
}

export function WeeklyPlannerClient({
  initialTasks,
  initialTags,
  weeklyCompletions: initialWeeklyCompletions,
  currentWeek,
  currentYear: initialYear,
  userId,
}: WeeklyPlannerClientProps) {
  const { selectedYear } = useYear()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [weeklyCompletions, setWeeklyCompletions] = useState(initialWeeklyCompletions)
  const [isPending, startTransition] = useTransition()
  const [isHydrated, setIsHydrated] = useState(false)
  const { toast } = useToast()

  // Tag dialog state
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")

  const supabase = createClient()

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch tasks and tags data for the selected year
  const fetchPlannerData = async () => {
    startTransition(async () => {
      // Fetch tasks for the selected year
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          *,
          tags:task_tags(tag:tags(*))
        `)
        .eq("user_id", userId)
        .eq("year", selectedYear)
        .order("sort_order", { ascending: true })

      // Fetch tags
      const { data: tags } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true })

      // Transform tasks to include tags array
      const transformedTasks =
        tasks?.map((task) => ({
          ...task,
          tags: task.tags?.map((t: { tag: unknown }) => t.tag) || [],
        })) || []

      // Calculate weekly completions for heatmap
      const weeklyCompletions = Array.from({ length: 52 }, (_, i) => {
        const weekTasks = transformedTasks.filter((t) => t.week_number === i + 1)
        return {
          week: i + 1,
          completed: weekTasks.filter((t) => t.completed).length,
          total: weekTasks.length,
        }
      })

      setTasks(transformedTasks)
      setTags(tags || [])
      setWeeklyCompletions(weeklyCompletions)
      setSelectedTags([])
    })
  }

  // Refresh data when year changes
  useEffect(() => {
    if (isHydrated) {
      fetchPlannerData()
    }
  }, [selectedYear, isHydrated])

  // Initialize with server data
  useEffect(() => {
    if (selectedYear === initialYear) {
      setTasks(initialTasks)
      setTags(initialTags)
      setWeeklyCompletions(initialWeeklyCompletions)
      setSelectedTags([])
    }
  }, [])

  // Ensure default tags exist for new users and clean up duplicates
  useEffect(() => {
    const ensureDefaultTags = async () => {
      try {
        // First, clean up any duplicate default tags (keep the oldest one)
        const { data: allDefaultTags } = await supabase
          .from("tags")
          .select("id, name, created_at")
          .eq("user_id", userId)
          .in("name", ["Personal", "Work"])
          .order("created_at", { ascending: true })

        if (allDefaultTags) {
          const seenNames = new Set<string>()
          const duplicatesToDelete: string[] = []

          for (const tag of allDefaultTags) {
            if (seenNames.has(tag.name)) {
              // This is a duplicate, mark for deletion
              duplicatesToDelete.push(tag.id)
            } else {
              seenNames.add(tag.name)
            }
          }

          // Delete duplicate tags
          if (duplicatesToDelete.length > 0) {
            await supabase.from("tags").delete().in("id", duplicatesToDelete)
          }
        }

        // Check if default tags exist in the database
        const { data: existingTags } = await supabase
          .from("tags")
          .select("name")
          .eq("user_id", userId)
          .in("name", ["Personal", "Work"])

        const existingNames = new Set(existingTags?.map((t) => t.name) || [])
        const defaults = [
          { user_id: userId, name: "Personal", color: "#6366f1", is_personal: true },
          { user_id: userId, name: "Work", color: "#ef4444", is_personal: false },
        ].filter((tag) => !existingNames.has(tag.name))

        // Only insert tags that don't already exist
        if (defaults.length > 0) {
          const { data: inserted, error } = await supabase.from("tags").insert(defaults).select()
          if (!error && inserted) {
            setTags((prev) => [...inserted, ...prev])
          }
        } else if (allDefaultTags && allDefaultTags.length > 0) {
          // Refresh tags if we cleaned up duplicates
          const { data: refreshedTags } = await supabase
            .from("tags")
            .select("*")
            .eq("user_id", userId)
            .order("name", { ascending: true })
          if (refreshedTags) {
            setTags(refreshedTags)
          }
        }
      } catch (e) {
        console.error("Failed to ensure default tags:", e)
      }
    }

    ensureDefaultTags()
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateWeeklyCompletions = (updatedTasks: Task[]) => {
    const newCompletions = Array.from({ length: 52 }, (_, i) => {
      const weekTasks = updatedTasks.filter((t) => t.week_number === i + 1)
      return {
        week: i + 1,
        completed: weekTasks.filter((t) => t.completed).length,
        total: weekTasks.length,
      }
    })

    // detect newly completed weeks (transition from not-all-complete to all-complete)
    const prev = weeklyCompletions
    const newlyCompleted = newCompletions.filter((w, idx) => {
      const prevWeek = prev[idx]
      const wasComplete = prevWeek ? prevWeek.completed === prevWeek.total && prevWeek.total > 0 : false
      const nowComplete = w.total > 0 && w.completed === w.total
      return !wasComplete && nowComplete
    })

    if (newlyCompleted.length > 0) {
      const encouragements = [
        "Keep going!",
        "Great momentum!",
        "Awesome work — you got this!",
        "Strong start to next week!",
        "Nice streak — keep it up!",
      ]
      newlyCompleted.forEach((w) => {
        const word = encouragements[Math.floor(Math.random() * encouragements.length)]
        const message = `Week ${w.week} complete — ${word}`
        toast({ title: "Week complete", description: message })

        // Broadcast to other parts of the app (header) so it can show in notifications
        try {
          const bc = new BroadcastChannel("lumen-notifications")
          bc.postMessage({ type: "week_complete", payload: { id: `wc-${Date.now()}`, week: w.week, message } })
          bc.close()
        } catch (e) {
          // BroadcastChannel may not be available in some environments; ignore
        }
      })
    }

    setWeeklyCompletions(newCompletions)
  }

  const handleAddTask = async (
    weekNumber: number,
    title: string,
    description?: string | null,
    tagIds?: string[],
  ) => {
    const newTask: Partial<Task> = {
      user_id: userId,
      title,
      description: description || null,
      week_number: weekNumber,
      year: selectedYear,
      completed: false,
      sort_order: tasks.filter((t) => t.week_number === weekNumber).length,
    }

    try {
      console.log("Creating task:", newTask)
      const { data, error } = await supabase.from("tasks").insert(newTask).select().single()

      if (error) {
        console.error("Task insert error - Full error object:", JSON.stringify(error, null, 2))
        console.error("Task insert error - Error message:", error?.message)
        console.error("Task insert error - Error details:", error?.details)
        toast({ title: "Failed to create task", description: error?.message || "Unknown error", variant: "destructive" })
        return
      }

      console.log("Task created:", data)

      // attach tags if provided
      if (tagIds && tagIds.length > 0) {
        try {
          const tagInserts = tagIds.map((tagId) => ({ task_id: data.id, tag_id: tagId }))
          console.log("Inserting task tags:", tagInserts)
          await supabase.from("task_tags").insert(tagInserts)
        } catch (e) {
          console.error("Failed to attach tags to task:", e)
        }
      }

      // optimistic: include tag objects for the created task based on selected tagIds
      const attachedTags = tagIds && tagIds.length > 0 ? tags.filter((t) => tagIds?.includes(t.id)) : []
      const updatedTasks = [...tasks, { ...data, tags: attachedTags }]
      setTasks(updatedTasks)
      updateWeeklyCompletions(updatedTasks)
      toast({ title: "Task created" })
    } catch (e) {
      console.error("Unexpected error creating task:", e)
      toast({ title: "Failed to create task", variant: "destructive" })
    }
  }

  const spawnConfetti = () => {
    try {
      const duration = 2000
      const end = Date.now() + duration
      const colors = ["#bb0000", "#ffffff", "#00bbff", "#ffd700", "#00ff7f"]

      const canvas = document.createElement("canvas")
      canvas.style.position = "fixed"
      canvas.style.top = "0"
      canvas.style.left = "0"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      canvas.style.pointerEvents = "none"
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      document.body.appendChild(canvas)
      const ctx = canvas.getContext("2d")!

      const particles: any[] = []
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          r: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 6 + 2,
          rot: Math.random() * Math.PI,
        })
      }

      function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        particles.forEach((p) => {
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.15
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.rot, 0, Math.PI * 2)
          ctx.fill()
        })
        if (Date.now() < end) {
          requestAnimationFrame(frame)
        } else {
          canvas.remove()
        }
      }

      requestAnimationFrame(frame)
    } catch (e) {
      // ignore if document not available
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    startTransition(async () => {
      const { error } = await supabase
        .from("tasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId)

      if (!error) {
        const updatedTasks = tasks.map((t) =>
          t.id === taskId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t,
        )
        setTasks(updatedTasks)
        updateWeeklyCompletions(updatedTasks)
        if (completed) spawnConfetti()
      }
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    startTransition(async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (!error) {
        const updatedTasks = tasks.filter((t) => t.id !== taskId)
        setTasks(updatedTasks)
        updateWeeklyCompletions(updatedTasks)
      }
    })
  }

  const handleEditTask = async (taskId: string, updates: Partial<Task>) => {
    startTransition(async () => {
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskId).select().single()

      if (!error && data) {
        const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t))
        setTasks(updatedTasks)
        updateWeeklyCompletions(updatedTasks)
      }
    })
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    startTransition(async () => {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          user_id: userId,
          name: newTagName.trim(),
          color: newTagColor,
        })
        .select()
        .single()

      if (!error && data) {
        setTags([...tags, data])
        setNewTagName("")
        setNewTagColor("#3b82f6")
        setIsTagDialogOpen(false)
      }
    })
  }

  const handleDeleteTag = async (tagId: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase.from("tags").delete().eq("id", tagId)
        if (!error) {
          setTags((prev) => prev.filter((t) => t.id !== tagId))
          setTasks((prev) => prev.map((task) => ({ ...task, tags: task.tags?.filter((tg) => tg.id !== tagId) })))
          toast({ title: "Tag deleted" })
        } else {
          console.error("Failed to delete tag:", error)
          toast({ title: "Failed to delete tag", variant: "destructive" })
        }
      } catch (e) {
        console.error(e)
        toast({ title: "Failed to delete tag", variant: "destructive" })
      }
    })
  }

  // Filter tasks by selected tags
  const filteredTasks =
    selectedTags.length > 0 ? tasks.filter((task) => task.tags?.some((tag) => selectedTags.includes(tag.id))) : tasks

  // Generate weeks array with filtered tasks
  const weeks = Array.from({ length: 52 }, (_, i) => ({
    weekNumber: i + 1,
    tasks: filteredTasks.filter((t) => t.week_number === i + 1),
  }))

  // Determine if the selectedYear equals the real calendar year; only then mark current week
  const realCurrentYear = new Date().getFullYear()
  const isViewingRealCurrentYear = selectedYear === realCurrentYear
  const displayCurrentWeek = isViewingRealCurrentYear ? currentWeek : null

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isHydrated ? selectedYear : initialYear} Planner</h1>
          <p className="text-muted-foreground">
            Week {isViewingRealCurrentYear ? currentWeek : "–"} of 52
          </p>
        </div>
        <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-tour-id="manage-tags">
              <TagIcon className="h-4 w-4 mr-2" />
              Manage Tags
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>Add a tag to categorize your tasks.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Work, Personal, Health"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagColor">Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="tagColor"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{newTagColor}</span>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 text-xs rounded-md text-white flex items-center"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteTag(tag.id)}
                          title={`Delete ${tag.name}`}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTag} disabled={isPending || !newTagName.trim()}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Heatmap */}
      <div className="p-4 border border-border rounded-lg bg-card">
        <ProgressHeatmap data={weeklyCompletions} currentWeek={displayCurrentWeek || -1} />
      </div>

      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="text-sm font-medium mb-3">Filter by Tags</h3>
          <TagFilter tags={tags} selectedTags={selectedTags} onToggleTag={handleToggleTag} />
        </div>
      )}

      {/* Weeks */}
      <div className="space-y-3">
        {weeks.map(({ weekNumber, tasks: weekTasks }) => (
          <WeekCard
            key={weekNumber}
            weekNumber={weekNumber}
            year={selectedYear || initialYear}
            tasks={weekTasks}
            tags={tags}
            isCurrentWeek={displayCurrentWeek === weekNumber}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            defaultExpanded={weekNumber === currentWeek}
          />
        ))}
      </div>

      <MobileNav />
    </div>
  )
}
