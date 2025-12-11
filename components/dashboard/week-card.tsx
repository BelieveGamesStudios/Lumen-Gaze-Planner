"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Task, Tag } from "@/lib/types"
import { getWeekDates } from "@/lib/utils/date"

interface WeekCardProps {
  weekNumber: number
  year: number
  tasks: Task[]
  tags: Tag[]
  isCurrentWeek: boolean
  onAddTask: (weekNumber: number, title: string) => void
  onToggleTask: (taskId: string, completed: boolean) => void
  onDeleteTask: (taskId: string) => void
  onEditTask?: (taskId: string, updates: Partial<Task>) => void
  defaultExpanded?: boolean
}

export function WeekCard({
  weekNumber,
  year,
  tasks,
  tags,
  isCurrentWeek,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  defaultExpanded = false,
}: WeekCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isCurrentWeek)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      onAddTask(weekNumber, newTaskTitle.trim())
      setNewTaskTitle("")
      setIsAdding(false)
    }
  }

  const getTagById = (tagId: string) => tags.find((t) => t.id === tagId)

  return (
    <div
      className={cn(
        "border border-border rounded-lg overflow-hidden transition-colors",
        isCurrentWeek && "border-primary/50 bg-primary/5",
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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
            <div
              key={task.id}
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
              {editingId === task.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (editingTitle.trim()) {
                      onEditTask?.(task.id, { title: editingTitle.trim() })
                      setEditingId(null)
                      setEditingTitle("")
                    }
                  }}
                  className="flex-1"
                >
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                </form>
              ) : (
                <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
              )}
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
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(task.id)
                    setEditingTitle(task.title)
                  }}
                >
                  <Edit className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onDeleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {isAdding ? (
            <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="sm">
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add task
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
