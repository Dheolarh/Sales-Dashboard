-- RLS POLICIES FOR INSERTING DATA

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'products' 
          AND policyname = 'Allow authenticated & anon users to insert products'
    ) THEN
        CREATE POLICY "Allow authenticated & anon users to insert products"
        ON public.products
        FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'companies' 
          AND policyname = 'Allow authenticated & anon users to insert companies'
    ) THEN
        CREATE POLICY "Allow authenticated & anon users to insert companies"
        ON public.companies
        FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'categories' 
          AND policyname = 'Allow authenticated & anon users to insert categories'
    ) THEN
        CREATE POLICY "Allow authenticated & anon users to insert categories"
        ON public.categories
        FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'admins' 
          AND policyname = 'Allow authenticated & anon users to insert admins'
    ) THEN
        CREATE POLICY "Allow authenticated & anon users to insert admins"
        ON public.admins
        FOR INSERT
        TO authenticated, anon
        WITH CHECK (true);
    END IF;
END $$;