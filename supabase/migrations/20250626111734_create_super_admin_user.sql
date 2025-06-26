-- Create the initial superadmin user
-- This script runs in a special context that allows admin-level functions.

DO $$
DECLARE
  -- Replace with your desired credentials
  super_admin_email    TEXT := 'admin@quickcart.com';
  super_admin_password TEXT := 'quickcart1';
  super_admin_username TEXT := 'superadmin';
  super_admin_full_name TEXT := 'Default Super Admin';
  user_id              UUID;
BEGIN
  -- 1. Create the user in the `auth.users` table
  -- This will return the new user's UID into the `user_id` variable.
  user_id := (
    SELECT auth.admin_create_user(
      super_admin_email,
      super_admin_password,
      '{"username":"' || super_admin_username || '", "full_name":"' || super_admin_full_name || '"}'
    )
  );

  -- 2. Create the user's profile in the public `admins` table
  -- Use the UID from the previous step as the primary key.
  INSERT INTO public.admins (id, email, username, full_name, role, is_active)
  VALUES (
    user_id,
    super_admin_email,
    super_admin_username,
    super_admin_full_name,
    'super_admin',
    true
  );
END $$;