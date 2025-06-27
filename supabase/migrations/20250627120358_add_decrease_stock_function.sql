CREATE OR REPLACE FUNCTION decrease_stock(product_id_in uuid, quantity_in int)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock - quantity_in
  WHERE id = product_id_in;
END;
$$ LANGUAGE plpgsql;