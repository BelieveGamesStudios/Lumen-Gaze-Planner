"use client"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { useYear } from "@/contexts/year-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Plus, Target, Trash2, Edit2, CheckCircle2, Link2, CalendarRange } from "lucide-react"
import type { YearlyGoal, Task } from "@/lib/types"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
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

interface GoalWithProgress extends YearlyGoal {
  linked_tasks: number
  completed_tasks: number
  progress: number
}

interface DecadeGoal {
  id: string
  user_id: string
  title: string
  description: string | null
  start_year: number
  end_year: number
  created_at?: string
}

interface GoalsClientProps {
  initialGoals: GoalWithProgress[]
  initialDecadeGoals: DecadeGoal[]
  currentYear: number
  userId: string
}

export function GoalsClient({ initialGoals, initialDecadeGoals, currentYear: initialYear, userId }: GoalsClientProps) {
  const { selectedYear } = useYear()
  const [goals, setGoals] = useState<GoalWithProgress[]>(initialGoals)
  const [decadeGoals, setDecadeGoals] = useState<DecadeGoal[]>(initialDecadeGoals)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDecadeDialogOpen, setIsDecadeDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null)
  const [editingDecadeGoal, setEditingDecadeGoal] = useState<DecadeGoal | null>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)
  const [deleteDecadeGoalId, setDeleteDecadeGoalId] = useState<string | null>(null)
  const [linkingGoalId, setLinkingGoalId] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [decadeTitle, setDecadeTitle] = useState("")
  const [decadeDescription, setDecadeDescription] = useState("")

  const supabase = createClient()

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch goals data for the selected year
  const fetchGoalsData = async () => {
    startTransition(async () => {
      // Fetch yearly goals
      const { data: goals } = await supabase
        .from("yearly_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("year", selectedYear)
        .order("created_at", { ascending: true })

      // Fetch tasks linked to goals
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("year", selectedYear)
        .not("goal_id", "is", null)

      // Fetch decade goals (not filtered by selected year)
      const { data: decadeGoals } = await supabase
        .from("decade_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      // Calculate progress for each goal
      const goalsWithProgress =
        goals?.map((goal) => {
          const linkedTasks = tasks?.filter((t) => t.goal_id === goal.id) || []
          const completedTasks = linkedTasks.filter((t) => t.completed).length
          return {
            ...goal,
            linked_tasks: linkedTasks.length,
            completed_tasks: completedTasks,
            progress: linkedTasks.length > 0 ? Math.round((completedTasks / linkedTasks.length) * 100) : 0,
          }
        }) || []

      setGoals(goalsWithProgress)
      setDecadeGoals(decadeGoals || [])
    })
  }

  // Refresh goals when year changes
  useEffect(() => {
    if (isHydrated) {
      fetchGoalsData()
    }
  }, [selectedYear, isHydrated])

  // Initialize with server data
  useEffect(() => {
    if (selectedYear === initialYear) {
      setGoals(initialGoals)
      setDecadeGoals(initialDecadeGoals)
    }
  }, [])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setTargetValue("")
  }

  const resetDecadeForm = () => {
    setDecadeTitle("")
    setDecadeDescription("")
  }

  const handleCreateGoal = async () => {
    if (!title.trim()) return

    startTransition(async () => {
      const { data, error } = await supabase
        .from("yearly_goals")
        .insert({
          user_id: userId,
          year: selectedYear,
          title: title.trim(),
          description: description.trim() || null,
          target_value: targetValue ? Number.parseInt(targetValue) : null,
        })
        .select()
        .single()

      if (!error && data) {
        setGoals([...goals, { ...data, linked_tasks: 0, completed_tasks: 0, progress: 0 }])
        resetForm()
        setIsCreateDialogOpen(false)
      }
    })
  }

  const handleCreateDecadeGoal = async () => {
    if (!decadeTitle.trim() || decadeGoals.length >= 5) return

    startTransition(async () => {
      const startYear = selectedYear
      const endYear = selectedYear + 10
      const { data, error } = await supabase
        .from("decade_goals")
        .insert({
          user_id: userId,
          title: decadeTitle.trim(),
          description: decadeDescription.trim() || null,
          start_year: startYear,
          end_year: endYear,
        })
        .select()
        .single()

      if (!error && data) {
        setDecadeGoals((prev) => [...prev, data])
        resetDecadeForm()
        setIsDecadeDialogOpen(false)
        toast({ title: "10-year goal created successfully" })
      } else {
        console.error("Failed to create decade goal:", error)
        toast({
          title: "Failed to create 10-year goal",
          description: error?.message || "Please try again",
          variant: "destructive"
        })
      }
    })
  }

  const handleUpdateGoal = async () => {
    if (!editingGoal || !title.trim()) return

    startTransition(async () => {
      const { error } = await supabase
        .from("yearly_goals")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          target_value: targetValue ? Number.parseInt(targetValue) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingGoal.id)

      if (!error) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === editingGoal.id
              ? {
                  ...g,
                  title: title.trim(),
                  description: description.trim() || null,
                  target_value: targetValue ? Number.parseInt(targetValue) : null,
                }
              : g,
          ),
        )
        resetForm()
        setEditingGoal(null)
      }
    })
  }

  const handleUpdateDecadeGoal = async () => {
    if (!editingDecadeGoal || !decadeTitle.trim()) return

    startTransition(async () => {
      const { error, data } = await supabase
        .from("decade_goals")
        .update({
          title: decadeTitle.trim(),
          description: decadeDescription.trim() || null,
        })
        .eq("id", editingDecadeGoal.id)
        .select()
        .single()

      if (!error && data) {
        setDecadeGoals((prev) => prev.map((g) => (g.id === data.id ? data : g)))
        resetDecadeForm()
        setEditingDecadeGoal(null)
        setIsDecadeDialogOpen(false)
      }
    })
  }

  const handleDeleteGoal = async () => {
    if (!deleteGoalId) return

    startTransition(async () => {
      const { error } = await supabase.from("yearly_goals").delete().eq("id", deleteGoalId)

      if (!error) {
        setGoals((prev) => prev.filter((g) => g.id !== deleteGoalId))
      }
      setDeleteGoalId(null)
    })
  }

  const handleDeleteDecadeGoal = async () => {
    if (!deleteDecadeGoalId) return

    startTransition(async () => {
      try {
        const { error } = await supabase.from("decade_goals").delete().eq("id", deleteDecadeGoalId)
        if (!error) {
          setDecadeGoals((prev) => prev.filter((g) => g.id !== deleteDecadeGoalId))
          setDeleteDecadeGoalId(null)
        }
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleToggleGoalComplete = async (goal: GoalWithProgress) => {
    startTransition(async () => {
      const newCompleted = goal.progress < 100
      const { error } = await supabase
        .from("yearly_goals")
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goal.id)

      if (!error) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id ? { ...g, progress: newCompleted ? 100 : 0 } : g,
          ),
        )
      }
    })
  }

  const handleOpenLinkDialog = async (goalId: string) => {
    setLinkingGoalId(goalId)
    setSelectedTaskIds([])

    // Fetch all tasks for the current year
    startTransition(async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("year", selectedYear)

      if (data) {
        setAllTasks(data)
        // Pre-select already-linked tasks for this goal
        const goal = goals.find((g) => g.id === goalId)
        if (goal) {
          const linkedTaskIds = data.filter((t) => t.goal_id === goalId).map((t) => t.id)
          setSelectedTaskIds(linkedTaskIds)
        }
      }
    })
  }

  const handleSaveLinkedTasks = async () => {
    if (!linkingGoalId) return

    startTransition(async () => {
      // Unlink all tasks for this goal first
      await supabase.from("tasks").update({ goal_id: null }).eq("goal_id", linkingGoalId)

      // Link selected tasks
      if (selectedTaskIds.length > 0) {
        await supabase
          .from("tasks")
          .update({ goal_id: linkingGoalId })
          .in("id", selectedTaskIds)
      }

      // Update goal's linked task count
      const linkedCount = selectedTaskIds.length
      const completedCount = allTasks
        .filter((t) => selectedTaskIds.includes(t.id) && t.completed)
        .length

      setGoals((prev) =>
        prev.map((g) =>
          g.id === linkingGoalId
            ? {
                ...g,
                linked_tasks: linkedCount,
                completed_tasks: completedCount,
                progress: linkedCount > 0 ? Math.round((completedCount / linkedCount) * 100) : 0,
              }
            : g,
        ),
      )

      setLinkingGoalId(null)
    })
  }

  const openEditDialog = (goal: GoalWithProgress) => {
    setTitle(goal.title)
    setDescription(goal.description || "")
    setTargetValue(goal.target_value?.toString() || "")
    setEditingGoal(goal)
  }

  const openEditDecadeDialog = (goal: DecadeGoal) => {
    setDecadeTitle(goal.title)
    setDecadeDescription(goal.description || "")
    setEditingDecadeGoal(goal)
    setIsDecadeDialogOpen(true)
  }

  const completedGoals = goals.filter((g) => g.progress === 100).length
  const overallProgress =
    goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) : 0

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isHydrated ? selectedYear : initialYear} Goals</h1>
          <p className="text-muted-foreground">
            {goals.length} goals · {completedGoals} completed · {overallProgress}% overall
          </p>
        </div>
        {goals.length < 10 && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{goals.length}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{completedGoals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{goals.length - completedGoals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overallProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No goals set yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Set 5-10 big goals for the year and link tasks to track your progress.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} className={goal.progress === 100 ? "border-primary/50 bg-primary/5" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    {goal.progress === 100 ? (
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <h3 className="font-medium">{goal.title}</h3>
                      {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenLinkDialog(goal.id)}
                      title="Link tasks to this goal"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleGoalComplete(goal)}
                      title={goal.progress === 100 ? "Mark incomplete" : "Mark complete"}
                    >
                      {goal.progress === 100 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(goal)}>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteGoalId(goal.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {goal.completed_tasks} of {goal.linked_tasks} linked tasks
                    </span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                {goal.target_value && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Target: {goal.current_value || 0} / {goal.target_value}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 10-Year Plan */}
      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">10-Year Plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Long-term goals spanning a decade. New goals use the currently viewed year as the start year.
            </p>
          </div>
          {decadeGoals.length < 5 && (
            <Button onClick={() => setIsDecadeDialogOpen(true)}>
              <CalendarRange className="h-4 w-4 mr-2" />
              Add 10-Year Goal
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {decadeGoals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No decade goals yet. Add up to 5 long-term goals.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {decadeGoals.map((goal) => (
                <div key={goal.id} className="rounded-lg border border-border p-4 space-y-2 bg-card/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{goal.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {goal.start_year}–{goal.end_year}
                      </div>
                      {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDecadeDialog(goal)}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteDecadeGoalId(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Decade Goal Dialog */}
      <Dialog open={isDecadeDialogOpen} onOpenChange={setIsDecadeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDecadeGoal ? "Edit 10-Year Goal" : "Create 10-Year Goal"}</DialogTitle>
            <DialogDescription>Plan a long-term goal spanning a full decade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decadeTitle">Title</Label>
              <Input
                id="decadeTitle"
                value={decadeTitle}
                onChange={(e) => setDecadeTitle(e.target.value)}
                placeholder="e.g., Become a staff engineer, Publish a book"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decadeDescription">Description (optional)</Label>
              <Textarea
                id="decadeDescription"
                value={decadeDescription}
                onChange={(e) => setDecadeDescription(e.target.value)}
                placeholder="Outline the milestones you want to achieve over the decade."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Start year: {editingDecadeGoal?.start_year ?? selectedYear} · End year:{" "}
              {editingDecadeGoal?.end_year ?? selectedYear + 10}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDecadeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingDecadeGoal ? handleUpdateDecadeGoal : handleCreateDecadeGoal}
              disabled={isPending || !decadeTitle.trim() || decadeGoals.length >= 5}
            >
              {isPending ? "Saving..." : editingDecadeGoal ? "Save Changes" : "Create 10-Year Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Decade Goal Confirmation */}
      <AlertDialog open={!!deleteDecadeGoalId} onOpenChange={() => setDeleteDecadeGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete 10-Year Goal</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the 10-year goal and its decade range. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDecadeGoal}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingGoal}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setEditingGoal(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update your goal details."
                : "Set a big goal for the year. You can link tasks to it to track progress."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goalTitle">Goal Title</Label>
              <Input
                id="goalTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Read 24 books, Learn Spanish"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalDescription">Description (optional)</Label>
              <Textarea
                id="goalDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this goal important to you?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value (optional)</Label>
              <Input
                id="targetValue"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g., 24 for '24 books'"
              />
              <p className="text-xs text-muted-foreground">Set a numeric target to track quantifiable goals.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setEditingGoal(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingGoal ? handleUpdateGoal : handleCreateGoal} disabled={isPending || !title.trim()}>
              {isPending ? "Saving..." : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the goal. Tasks linked to this goal will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Tasks Dialog */}
      <Dialog open={!!linkingGoalId} onOpenChange={() => setLinkingGoalId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Tasks to Goal</DialogTitle>
            <DialogDescription>
              Select tasks to link to this goal. Their completion will contribute to the goal progress.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96 border rounded-lg p-4">
            <div className="space-y-2">
              {allTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks found for this year.</p>
              ) : (
                allTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds((prev) => [...prev, task.id])
                        } else {
                          setSelectedTaskIds((prev) => prev.filter((id) => id !== task.id))
                        }
                      }}
                    />
                    <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer text-sm">
                      <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">Week {task.week_number}</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingGoalId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLinkedTasks} disabled={isPending}>
              {isPending ? "Saving..." : "Save Links"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
