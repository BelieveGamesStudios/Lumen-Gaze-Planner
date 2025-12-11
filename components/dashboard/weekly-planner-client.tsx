"use client"

import { useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { WeekCard } from "./week-card"
import { ProgressHeatmap } from "./progress-heatmap"
import { TagFilter } from "./tag-filter"
import { MobileNav } from "./mobile-nav"
import { Button } from "@/components/ui/button"
import { TagIcon } from "lucide-react"
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
  currentYear,
  userId,
}: WeeklyPlannerClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [weeklyCompletions, setWeeklyCompletions] = useState(initialWeeklyCompletions)
  const [isPending, startTransition] = useTransition()

  // Tag dialog state
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")

  const supabase = createClient()

  const updateWeeklyCompletions = (updatedTasks: Task[]) => {
    const newCompletions = Array.from({ length: 52 }, (_, i) => {
      const weekTasks = updatedTasks.filter((t) => t.week_number === i + 1)
      return {
        week: i + 1,
        completed: weekTasks.filter((t) => t.completed).length,
        total: weekTasks.length,
      }
    })
    setWeeklyCompletions(newCompletions)
  }

  const handleAddTask = async (weekNumber: number, title: string) => {
    const newTask: Partial<Task> = {
      user_id: userId,
      title,
      week_number: weekNumber,
      year: currentYear,
      completed: false,
      sort_order: tasks.filter((t) => t.week_number === weekNumber).length,
    }

    startTransition(async () => {
      const { data, error } = await supabase.from("tasks").insert(newTask).select().single()

      if (!error && data) {
        const updatedTasks = [...tasks, { ...data, tags: [] }]
        setTasks(updatedTasks)
        updateWeeklyCompletions(updatedTasks)
      }
    })
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

  // Filter tasks by selected tags
  const filteredTasks =
    selectedTags.length > 0 ? tasks.filter((task) => task.tags?.some((tag) => selectedTags.includes(tag.id))) : tasks

  // Generate weeks array with filtered tasks
  const weeks = Array.from({ length: 52 }, (_, i) => ({
    weekNumber: i + 1,
    tasks: filteredTasks.filter((t) => t.week_number === i + 1),
  }))

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{currentYear} Planner</h1>
          <p className="text-muted-foreground">Week {currentWeek} of 52</p>
        </div>
        <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
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
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs rounded-md text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
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
        <ProgressHeatmap data={weeklyCompletions} currentWeek={currentWeek} />
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
            year={currentYear}
            tasks={weekTasks}
            tags={tags}
            isCurrentWeek={weekNumber === currentWeek}
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
