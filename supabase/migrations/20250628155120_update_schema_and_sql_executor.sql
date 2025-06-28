-- Create function to get schema information with relationships
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
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
    WHERE c.relkind = 'r' -- regular tables
      AND n.nspname = 'public'
      AND NOT c.relname LIKE 'pg_%'
      AND NOT c.relname LIKE 'sql_%'
  ),
  column_info AS (
    SELECT
      a.attrelid AS table_oid,
      jsonb_agg(jsonb_build_object(
        'column_name', a.attname,
        'data_type', format_type(a.atttypid, a.atttypmod),
        'description', col_description(a.attrelid, a.attnum)
      )) AS columns
    FROM pg_attribute a
    WHERE a.attnum > 0 AND NOT a.attisdropped
    GROUP BY a.attrelid
  ),
  relationship_info AS (
    SELECT
      con.conrelid AS table_oid,
      jsonb_agg(jsonb_build_object(
        'from_column', (SELECT attname FROM pg_attribute WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)),
        'to_table', confrel.relname,
        'to_column', (SELECT attname FROM pg_attribute WHERE attrelid = con.confrelid AND attnum = ANY(con.confkey))
      )) AS relationships
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
    WHERE con.contype = 'f'
    GROUP BY con.conrelid
  )
  SELECT
    ti.table_name,
    ti.table_description,
    COALESCE(ci.columns, '[]'::jsonb),
    COALESCE(ri.relationships, '[]'::jsonb)
  FROM table_info ti
  LEFT JOIN column_info ci ON ci.table_oid = ti.table_oid
  LEFT JOIN relationship_info ri ON ri.table_oid = ti.table_oid;
END;
$$ LANGUAGE plpgsql;

-- Update SQL executor to handle potential errors more gracefully
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json AS $$
DECLARE
  result_json json;
BEGIN
  -- Security: Basic validation to only allow SELECT statements.
  IF lower(trim(query)) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed for execution by the AI.';
  END IF;

  BEGIN
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result_json;
    RETURN result_json;
  EXCEPTION WHEN others THEN
    -- Return a JSON object with the error message if the query fails
    RETURN json_build_object('error', SQLERRM, 'sql_state', SQLSTATE);
  END;
END;
$$ LANGUAGE plpgsql;