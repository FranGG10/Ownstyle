-- Agregar campos adicionales para ventas
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS nombre_cliente VARCHAR(200);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS barrio VARCHAR(100);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS direccion VARCHAR(300);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS importe_total DECIMAL(12,2);
