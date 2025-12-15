"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Edit, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { Task, Tag } from "@/lib/types"
import { getWeekDates } from "@/lib/utils/date"

interface WeekCardProps {
  weekNumber: number
  year: number
  tasks: Task[]
  tags: Tag[]
  isCurrentWeek: boolean
  onAddTask: (weekNumber: number, title: string, description?: string | null, tagIds?: string[]) => void
  onToggleTask: (taskId: string, completed: boolean) => void
  onDeleteTask: (taskId: string) => void
  onEditTask?: (taskId: string, updates: Partial<Task>) => void
  defaultExpanded?: boolean
}

export const WeekCard = memo(function WeekCard({
  weekNumber,
  year,
  tasks,
  tags,
  isCurrentWeek,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  defaultExpanded = false,
}: WeekCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isCurrentWeek)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState<string | null>(null)
  const [newTaskTagIds, setNewTaskTagIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const { formatted } = getWeekDates(weekNumber, year)

  // Sort tasks: incomplete first, then completed at bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return a.sort_order - b.sort_order
    }
    return a.completed ? 1 : -1
  })

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleAddTask = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      onAddTask(weekNumber, newTaskTitle.trim(), newTaskDescription, newTaskTagIds)
      setNewTaskTitle("")
      setNewTaskDescription(null)
      setNewTaskTagIds([])
      setIsAdding(false)
    }
  }, [newTaskTitle, newTaskDescription, newTaskTagIds, onAddTask, weekNumber])

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleStartAdding = useCallback(() => {
    setIsAdding(true)
  }, [])

  const handleCancelAdding = useCallback(() => {
    setIsAdding(false)
  }, [])

  const getTagById = (tagId: string) => tags.find((t) => t.id === tagId)

  return (
    <div
      className={cn(
        "border border-border rounded-lg overflow-hidden transition-colors",
        isCurrentWeek && "border-primary/50 bg-primary/5",
      )}
    >
      <button
        onClick={handleToggleExpanded}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Week {weekNumber}</span>
              {isCurrentWeek && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formatted}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <>
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {completedCount}/{totalCount}
              </span>
            </>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border p-4 space-y-2">
          {sortedTasks.map((task) => (
            <div key={task.id}>
              <div
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md group hover:bg-secondary/50 transition-colors",
                  task.completed && "opacity-60",
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onToggleTask(task.id, checked as boolean)}
                />

                <div className="flex-1" onClick={() => setExpandedTaskId(task.id)}>
                  {editingId === task.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (editingTitle.trim()) {
                          onEditTask?.(task.id, { title: editingTitle.trim(), description: editingDescription })
                          setEditingId(null)
                          setEditingTitle("")
                          setEditingDescription(null)
                        }
                      }}
                      className="flex flex-col"
                    >
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 mb-2"
                        autoFocus
                      />
                      <Textarea
                        value={editingDescription || ""}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <Button type="submit" size="sm">Confirm</Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(null)
                            setEditingTitle("")
                            setEditingDescription(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                      <div>{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground mt-1 italic">Click to show description</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(task.id)
                      setEditingTitle(task.title)
                      setEditingDescription(task.description || null)
                    }}
                  >
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteTask(task.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {expandedTaskId === task.id && (
                <div className="border-l-2 border-border ml-8 p-3 bg-background/50 rounded-md mt-2 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{task.title}</div>
                      <div className="text-sm text-muted-foreground mt-2">{task.description || "No description"}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedTaskId(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAdding ? (
            <form onSubmit={handleAddTask} className="flex flex-col gap-2 pt-2">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Textarea
                placeholder="Description (optional)"
                value={newTaskDescription || ""}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="w-full"
              />
              {tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Assign tags</label>
                  <div className="flex gap-2 overflow-x-auto">
                    {tags.map((t) => {
                      const selected = newTaskTagIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNewTaskTagIds((prev) => (prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap",
                            selected ? "text-white" : "text-muted-foreground",
                          )}
                          style={
                            selected
                              ? { backgroundColor: t.color }
                              : { backgroundColor: "transparent", border: `1px solid ${t.color}` }
                          }
                        >
                          {t.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm">
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelAdding}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground"
              onClick={handleStartAdding}
              data-tour-id="add-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add task
            </Button>
          )}
        </div>
      )}
    </div>
  )
})
