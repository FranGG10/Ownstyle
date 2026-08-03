-- Frases nuevas para el parser de "Pegar texto" (ventas por carga masiva):
-- variantes de "Baggy Gris Oscuro" (que ya existe como producto, categoría Ropa,
-- talles M/L/XL/XXL, stock ilimitado por categoría) y un alias corto para
-- "Baggy Gris Claro".
INSERT INTO diccionario_productos (frase, sku_base, marca, modelo) VALUES
  ('Baggy grisoscuro', 'BAGGY-GRISOSCURO-XX', 'Baggy', 'Baggy'),
  ('Baggy gris oscuro', 'BAGGY-GRISOSCURO-XX', 'Baggy', 'Baggy'),
  ('Baggy oscuro', 'BAGGY-GRISOSCURO-XX', 'Baggy', 'Baggy'),
  ('Baggy claro', 'BAGGY-GRISCLARO-XX', 'Baggy', 'Baggy');
