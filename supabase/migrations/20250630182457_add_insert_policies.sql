-- RLS POLICIES FOR INSERTING DATA

-- 1. Policy for Products
-- Allows authenticated users to add new products.
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Policy for Companies
-- Allows authenticated users to add new companies.
CREATE POLICY "Allow authenticated users to insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policy for Categories
-- Allows authenticated users to add new categories.
CREATE POLICY "Allow authenticated users to insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Policy for Admins
-- Allows authenticated users to add new admins.
-- NOTE: For enhanced security, you might want to restrict this to only 'super_admin' roles.
CREATE POLICY "Allow authenticated users to insert admins"
ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (true);

-- More Secure Policy for Admins (Optional)
-- This policy only allows users with the 'super_admin' role to add new admins.
-- To use this, you would first need to get the current user's role.
-- CREATE POLICY "Allow super admins to insert admins"
-- ON public.admins
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   (SELECT role FROM public.admins WHERE id = auth.uid()) = 'super_admin'
-- );