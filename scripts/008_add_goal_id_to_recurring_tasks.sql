-- Add goal_id column to recurring_tasks table
ALTER TABLE recurring_tasks ADD COLUMN goal_id UUID REFERENCES yearly_goals(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_goal_id ON recurring_tasks(goal_id);
