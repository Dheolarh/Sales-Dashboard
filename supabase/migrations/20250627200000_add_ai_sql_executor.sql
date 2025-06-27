-- supabase/migrations/20250627200000_add_ai_sql_executor.sql

CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  result_json json;
BEGIN
  -- Security: Basic validation to only allow SELECT statements.
  -- This is a critical security measure.
  IF lower(trim(query)) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed for execution by the AI.';
  END IF;

  -- Execute the validated query and aggregate the results into a single JSON array.
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result_json;

  RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for authenticated users (like your AI function) to use this new tool.
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;