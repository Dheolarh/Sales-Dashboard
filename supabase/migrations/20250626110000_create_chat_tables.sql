/*
  Adds tables for persistent, multi-session chat history.

  - `chat_sessions`: Stores a record for each conversation a user has.
  - `chat_messages`: Stores individual messages belonging to a session.
*/

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL, -- 'user' or 'assistant'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for the new tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage their own chat sessions
CREATE POLICY "Admins can manage their own chat sessions"
ON chat_sessions FOR ALL
TO authenticated
USING (auth.uid() = admin_id)
WITH CHECK (auth.uid() = admin_id);

-- Admins can manage messages in their own chat sessions
CREATE POLICY "Admins can manage messages in their own sessions"
ON chat_messages FOR ALL
TO authenticated
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE admin_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_admin_id ON chat_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);