--
-- RLS POLICIES FOR CHAT FUNCTIONALITY
--

-- 1. Policy for Chat Sessions
-- Users can view their own chat sessions.
CREATE POLICY "Allow individual read access on chat_sessions"
ON public.chat_sessions
FOR SELECT
USING (auth.uid() = admin_id);

-- Users can create chat sessions for themselves.
CREATE POLICY "Allow individual insert access on chat_sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (auth.uid() = admin_id);

-- Users can update their own chat sessions (e.g., for renaming).
CREATE POLICY "Allow individual update access on chat_sessions"
ON public.chat_sessions
FOR UPDATE
USING (auth.uid() = admin_id)
WITH CHECK (auth.uid() = admin_id);

-- Users can delete their own chat sessions.
CREATE POLICY "Allow individual delete access on chat_sessions"
ON public.chat_sessions
FOR DELETE
USING (auth.uid() = admin_id);


-- 2. Policy for Chat Messages
-- Users can view messages in sessions they have access to.
CREATE POLICY "Allow read access on chat_messages"
ON public.chat_messages
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE admin_id = auth.uid()
  )
);

-- Users can insert messages into their own chat sessions.
CREATE POLICY "Allow insert access on chat_messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM chat_sessions WHERE admin_id = auth.uid()
  )
);

-- Note: Update and Delete for chat_messages are typically not enabled for users
-- to preserve chat history integrity.