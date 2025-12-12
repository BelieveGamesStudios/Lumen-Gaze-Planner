-- Create decade goals table
CREATE TABLE IF NOT EXISTS decade_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_decade_goals_user ON decade_goals(user_id);

-- Enable Row Level Security
ALTER TABLE decade_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own decade goals" ON decade_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decade goals" ON decade_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decade goals" ON decade_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decade goals" ON decade_goals
  FOR DELETE USING (auth.uid() = user_id);
