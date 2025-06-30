-- 1. Policy for Products Update
-- Allows authenticated users to update products.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public'
          AND tablename = 'products' 
          AND policyname = 'Allow authenticated users to update products'
    ) THEN
        CREATE POLICY "Allow authenticated users to update products"
        ON public.products
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Policy for Companies Update
-- Allows authenticated users to update companies.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public'
          AND tablename = 'companies' 
          AND policyname = 'Allow authenticated users to update companies'
    ) THEN
        CREATE POLICY "Allow authenticated users to update companies"
        ON public.companies
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 3. Policy for Categories Update
-- Allows authenticated users to update categories.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public'
          AND tablename = 'categories' 
          AND policyname = 'Allow authenticated users to update categories'
    ) THEN
        CREATE POLICY "Allow authenticated users to update categories"
        ON public.categories
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Policy for Admins Update
-- Allows authenticated users to update admins.
-- NOTE: For enhanced security consider restricting updates to only 'super_admin' roles.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public'
          AND tablename = 'admins' 
          AND policyname = 'Allow authenticated users to update admins'
    ) THEN
        CREATE POLICY "Allow authenticated users to update admins"
        ON public.admins
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Optional: More Secure Policy for Admins Update
-- Only allows users with the 'super_admin' role to update admins.
-- Uncomment the following and adjust according to your role implementation.
-- CREATE POLICY "Allow super admins to update admins"
-- ON public.admins
-- FOR UPDATE
-- TO authenticated
-- USING ((SELECT role FROM public.admins WHERE id = auth.uid()) = 'super_admin')
-- WITH CHECK ((SELECT role FROM public.admins WHERE id = auth.uid()) = 'super_admin');