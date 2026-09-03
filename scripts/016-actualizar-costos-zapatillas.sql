-- Actualiza el costo de las zapatillas según lo indicado por Francisco.
-- "Knu" = todas las Vans excepto Hyline (que tiene su propio precio).
-- "Mq sin cápsula" = Mq sin cámara excepto "Sin Camara RG" (que es la gamuza,
-- ya tenía un costo distinto y se trata aparte como "Mq gamuza").
-- Jordan Blanca y las demás variantes de color del Nike 270 quedan cubiertas
-- según lo que confirmó Francisco (270: las 4 variantes; Jordan Blanca: sin tocar).

UPDATE productos SET costo = 14900, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Vans' AND modelo NOT LIKE 'Hyline%'; -- Knu

UPDATE productos SET costo = 15500, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Vans' AND modelo LIKE 'Hyline%'; -- Hylane/Hyline

UPDATE productos SET costo = 15500, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Campus';

UPDATE productos SET costo = 15500, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Puma';

UPDATE productos SET costo = 14500, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Airforce'; -- AIRFROCE

UPDATE productos SET costo = 14000, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Jordan' AND modelo = 'Panda'; -- Jordan baja

UPDATE productos SET costo = 16000, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Jordan' AND modelo = 'Bota'; -- Jordan bota

UPDATE productos SET costo = 14000, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'Nike' AND modelo = '270'; -- 270 clásica (las 4 variantes de color)

UPDATE productos SET costo = 12500, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'MQ' AND modelo LIKE 'Sin Camara%' AND modelo != 'Sin Camara RG'; -- Mq sin cápsula

UPDATE productos SET costo = 14000, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'MQ' AND modelo LIKE 'con Camara%'; -- Mq con cápsula

UPDATE productos SET costo = 14000, updated_at = CURRENT_TIMESTAMP
WHERE marca = 'MQ' AND modelo = 'Sin Camara RG'; -- Mq gamuza
