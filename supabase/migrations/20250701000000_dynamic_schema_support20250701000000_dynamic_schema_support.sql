-- Create function to get schema information
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS TABLE (
  table_name TEXT,
  description TEXT,
  columns JSONB,
  relationships JSONB
) AS $$
BEGIN
  RETURN QUERY 
  WITH table_info AS (
    SELECT 
      c.oid AS table_oid,
      c.relname::TEXT AS table_name,
      d.description AS table_description
    FROM pg_class c
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND NOT c.relname LIKE 'pg_%'
      AND NOT c.relname LIKE 'sql_%'
  ),
  column_info AS (
    SELECT 
      ti.table_oid,
      jsonb_agg(jsonb_build_object(
        'column_name', a.attname,
        'data_type', format_type(a.atttypid, a.atttypmod),
        'description', col_description(c.oid, a.attnum)
      )) AS columns
    FROM table_info ti
    JOIN pg_attribute a ON a.attrelid = ti.table_oid
    WHERE a.attnum > 0 
      AND NOT a.attisdropped
    GROUP BY ti.table_oid
  ),
  relationship_info AS (
    SELECT
      con.conrelid AS table_oid,
      jsonb_agg(jsonb_build_object(
        'relationship_type', 'Foreign Key',
        'target_table', cl.relname,
        'foreign_key', con.conkey::text
      )) AS relationships
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.confrelid
    WHERE con.contype = 'f'
    GROUP BY con.conrelid
  )
  SELECT
    ti.table_name,
    ti.table_description,
    ci.columns,
    COALESCE(ri.relationships, '[]'::jsonb) AS relationships
  FROM table_info ti
  LEFT JOIN column_info ci ON ci.table_oid = ti.table_oid
  LEFT JOIN relationship_info ri ON ri.table_oid = ti.table_oid;
END;
$$ LANGUAGE plpgsql;

-- Update SQL executor
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json AS $$
DECLARE
  result_json json;
BEGIN
  -- Security: Allow only SELECT queries
  IF lower(trim(query)) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  BEGIN
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result_json;
    RETURN result_json;
  EXCEPTION WHEN others THEN
    RETURN json_build_object('error', SQLERRM, 'sql', query);
  END;
END;
$$ LANGUAGE plpgsql;