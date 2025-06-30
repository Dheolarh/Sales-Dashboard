-- 1. Policy for Products Update
-- Allows authenticated users to update products.
CREATE POLICY "Allow authenticated users to update products"
ON public.products
FOR UPDATE
TO authenticated
USING (true)           -- condition for selecting rows to update
WITH CHECK (true);      -- condition for verifying the new data

-- 2. Policy for Companies Update
-- Allows authenticated users to update companies.
CREATE POLICY "Allow authenticated users to update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Policy for Categories Update
-- Allows authenticated users to update categories.
CREATE POLICY "Allow authenticated users to update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Policy for Admins Update
-- Allows authenticated users to update admins.
-- NOTE: For enhanced security consider restricting updates to only 'super_admin' roles.
CREATE POLICY "Allow authenticated users to update admins"
ON public.admins
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: More Secure Policy for Admins Update
-- Only allows users with the 'super_admin' role to update admins.
-- Uncomment the following and adjust according to your role implementation.
-- CREATE POLICY "Allow super admins to update admins"
-- ON public.admins
-- FOR UPDATE
-- TO authenticated
-- USING ((SELECT role FROM public.admins WHERE id = auth.uid()) = 'super_admin')
-- WITH CHECK ((SELECT role FROM public.admins WHERE id = auth.uid()) = 'super_admin');