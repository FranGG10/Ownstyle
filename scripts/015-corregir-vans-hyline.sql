-- Corrige el nombre del modelo "Vans Hight" -> "Vans Hyline" (estaba mal cargado,
-- el diccionario de "Pegar texto" ya usaba "Hyline" en sus frases pero el SKU/
-- descripción/modelo del producto real habían quedado con el error "Hight").
UPDATE productos
SET codigo_sku = REPLACE(codigo_sku, 'HIGHT', 'HYLINE'),
    descripcion = REPLACE(descripcion, 'Hight', 'Hyline'),
    modelo = REPLACE(modelo, 'Hight', 'Hyline'),
    updated_at = CURRENT_TIMESTAMP
WHERE codigo_sku ILIKE '%HIGHT%';

UPDATE diccionario_productos
SET sku_base = REPLACE(sku_base, 'HIGHT', 'HYLINE'),
    modelo = REPLACE(modelo, 'Hight', 'Hyline')
WHERE sku_base ILIKE '%HIGHT%';
