-- Add a table to track read status per user if not exists
CREATE TABLE IF NOT EXISTS notification_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, admin_id)
);

-- Add RLS policies
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own read status" ON notification_read_status
  FOR ALL USING (admin_id = auth.uid());