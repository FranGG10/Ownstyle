-- =============================================
-- Migración: Agregar campo medio_pago a movimientos
-- =============================================

-- Agregar columna medio_pago a la tabla movimientos
ALTER TABLE movimientos 
ADD COLUMN IF NOT EXISTS medio_pago VARCHAR(50);

-- Agregar columna modelo a productos si no existe
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS modelo VARCHAR(100);

-- Actualizar productos existentes para extraer el modelo de la descripción
UPDATE productos 
SET modelo = SPLIT_PART(descripcion, ' ', 2)
WHERE modelo IS NULL OR modelo = '';
