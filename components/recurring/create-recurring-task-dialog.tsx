"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Tag, YearlyGoal } from "@/lib/types"

interface CreateRecurringTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: Tag[]
  goals?: YearlyGoal[]
  onCreateTask: (
    title: string,
    description: string,
    recurrenceType: "daily" | "weekly" | "biweekly" | "monthly",
    selectedTagIds: string[],
  ) => void
  isPending: boolean
}

export function CreateRecurringTaskDialog({
  open,
  onOpenChange,
  tags,
  goals = [],
  onCreateTask,
  isPending,
}: CreateRecurringTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")

  const handleSubmit = () => {
    if (title.trim()) {
      onCreateTask(title.trim(), description.trim(), recurrenceType, selectedTags)
      // Reset form
      setTitle("")
      setDescription("")
      setRecurrenceType("weekly")
      setSelectedTags([])
      setSelectedGoalId("")
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Recurring Task</DialogTitle>
          <DialogDescription>
            This task will automatically be created across multiple weeks based on your chosen recurrence pattern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly review, Team meeting"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence Pattern</Label>
            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as typeof recurrenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (every week)</SelectItem>
                <SelectItem value="biweekly">Biweekly (every 2 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly (every 4 weeks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {goals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="goal">Link to Goal (optional)</Label>
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal to link this task to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id)
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      style={{
                        borderColor: tag.color,
                        backgroundColor: isSelected ? tag.color : "transparent",
                        color: isSelected ? "white" : tag.color,
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
