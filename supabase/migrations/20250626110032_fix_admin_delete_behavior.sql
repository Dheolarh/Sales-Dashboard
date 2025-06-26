-- First, drop the existing foreign key constraint
ALTER TABLE "public"."access_logs"
DROP CONSTRAINT "access_logs_admin_id_fkey";

-- Now, add the constraint back with the ON DELETE SET NULL behavior
ALTER TABLE "public"."access_logs"
ADD CONSTRAINT "access_logs_admin_id_fkey"
FOREIGN KEY (admin_id)
REFERENCES admins(id)
ON DELETE SET NULL;