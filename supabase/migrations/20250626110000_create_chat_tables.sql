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
