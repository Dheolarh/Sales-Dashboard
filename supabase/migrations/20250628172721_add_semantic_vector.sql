-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a vector column to the products table
ALTER TABLE products ADD COLUMN embedding vector(384);

-- Create a function to search for products using semantic similarity
CREATE OR REPLACE FUNCTION search_products(
  query_embedding vector(384),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
p.description,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE 1 - (p.embedding <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;