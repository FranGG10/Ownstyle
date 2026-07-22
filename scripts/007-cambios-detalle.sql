-- Crear tabla de detalle para cambios múltiples
CREATE TABLE IF NOT EXISTS cambios_detalle (
  id_detalle SERIAL PRIMARY KEY,
  id_cambio INTEGER NOT NULL REFERENCES cambios(id_cambio) ON DELETE CASCADE,
  id_producto_entregado INTEGER REFERENCES productos(id_producto),
  id_producto_recibido INTEGER REFERENCES productos(id_producto)
);

-- Migrar datos existentes de cambios a cambios_detalle
INSERT INTO cambios_detalle (id_cambio, id_producto_entregado, id_producto_recibido)
SELECT id_cambio, id_producto_entregado, id_producto_recibido FROM cambios
WHERE id_producto_entregado IS NOT NULL AND id_producto_recibido IS NOT NULL;
